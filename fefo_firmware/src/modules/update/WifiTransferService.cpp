#include "modules/update/WifiTransferService.h"

#include <SD.h>
#include <Update.h>
#include <WiFi.h>
#include <esp_task_wdt.h>
#include <mbedtls/sha256.h>

namespace fefo {

namespace {
void trimHttp(char* value) {
  if (!value) return;
  size_t n = strlen(value);
  while (n && (value[n - 1] == '\r' || value[n - 1] == '\n' || value[n - 1] == ' ')) value[--n] = 0;
}
}

void WifiTransferService::setError(const char* error) {
  strlcpy(lastError_, error ? error : "", sizeof(lastError_));
  Serial.printf("[WIFI PUSH] %s\n", lastError_);
  if (SD.cardType() != CARD_NONE) {
    SD.remove("/update.last");
    File status = SD.open("/update.last", FILE_WRITE);
    if (status) { status.print(lastError_); status.close(); }
  }
}

bool WifiTransferService::configurePush() {
  const uint64_t mac = ESP.getEfuseMac();
  snprintf(apSsid_, sizeof(apSsid_), "FEFO_WIFI_%04X", (unsigned)(mac & 0xFFFF));
  snprintf(apPassword_, sizeof(apPassword_), "Fefo%08X", (unsigned)(mac & 0xFFFFFFFF));
  snprintf(apToken_, sizeof(apToken_), "%08X%08X", esp_random(), esp_random());
  return true;
}

bool WifiTransferService::runPushServer() {
  setError("AP_STARTING");
  WiFi.mode(WIFI_AP);
  if (!WiFi.softAP(apSsid_, apPassword_, 6, false, 1)) { setError("AP_START_FAILED"); return false; }
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  server_.begin(); server_.setNoDelay(true);
  Serial.printf("[WIFI PUSH] %s ativo em %s; heap=%u.\n", apSsid_, WiFi.softAPIP().toString().c_str(), ESP.getFreeHeap());
  setError("AP_READY");
  bool finished = false;
  const uint32_t started = millis();
  uint32_t lastClientAt = started;
  // Uma transferencia ativa fica dentro de handlePushClient. Fora dela, 45 s
  // sem qualquer requisicao indicam que o Android abandonou a operacao.
  while (!finished && millis() - started < 5UL * 60UL * 1000UL &&
         millis() - lastClientAt < 45UL * 1000UL) {
    WiFiClient client = server_.available();
    if (client) {
      handlePushClient(client, finished);
      lastClientAt = millis();
    }
    delay(1);
  }
  server_.stop(); WiFi.softAPdisconnect(true); WiFi.mode(WIFI_OFF);
  if (!finished) setError("AP_TIMEOUT");
  return finished;
}

void WifiTransferService::reply(WiFiClient& client, int status, const char* message) {
  client.printf("HTTP/1.1 %d %s\r\nContent-Type: text/plain\r\nContent-Length: %u\r\nConnection: close\r\n\r\n%s", status, status == 200 ? "OK" : "ERROR", (unsigned)strlen(message), message);
}

void WifiTransferService::handlePushClient(WiFiClient& client, bool& finished) {
  client.setTimeout(2);
  char line[192]{}, method[12]{}, target[80]{}, path[64]{}, auth[48]{}, expectedSha[68]{};
  uint32_t contentLength = 0;
  size_t n = client.readBytesUntil('\n', line, sizeof(line) - 1); line[n] = 0; trimHttp(line);
  sscanf(line, "%11s %79s", method, target);
  while (client.connected()) {
    n = client.readBytesUntil('\n', line, sizeof(line) - 1); line[n] = 0; trimHttp(line);
    if (!line[0]) break;
    if (strncasecmp(line, "Content-Length:", 15) == 0) contentLength = strtoul(line + 15, nullptr, 10);
    else if (strncasecmp(line, "X-Fefo-Path:", 12) == 0) { strlcpy(path, line + 12, sizeof(path)); while (path[0] == ' ') memmove(path, path + 1, strlen(path)); }
    else if (strncasecmp(line, "X-Fefo-Token:", 13) == 0) { strlcpy(auth, line + 13, sizeof(auth)); while (auth[0] == ' ') memmove(auth, auth + 1, strlen(auth)); }
    else if (strncasecmp(line, "X-Fefo-Sha256:", 14) == 0) { strlcpy(expectedSha, line + 14, sizeof(expectedSha)); while (expectedSha[0] == ' ') memmove(expectedSha, expectedSha + 1, strlen(expectedSha)); }
  }
  if (strcmp(auth, apToken_) != 0) { reply(client, 403, "TOKEN_INVALID"); client.stop(); return; }
  if (strcmp(method, "POST") == 0 && strcmp(target, "/finish") == 0) {
    setError("OK");
    reply(client, 200, "FINISHED");
    client.flush();
    delay(250);
    client.stop();
    finished = true;
    return;
  }
  if (strcmp(method, "DELETE") == 0 && strcmp(target, "/file") == 0) {
    if (!validPath(path)) reply(client, 400, "PATH_INVALID");
    else {
      const bool existed = SD.exists(path);
      const bool removed = !existed || SD.remove(path);
      if (progressCallback_) progressCallback_(path, 1, 1, progressContext_);
      reply(client, removed ? 200 : 500, removed ? "DELETED" : "DELETE_FAILED");
    }
    client.stop(); return;
  }
  if (strcmp(method, "PUT") == 0 && strcmp(target, "/file") == 0 &&
      strcmp(path, "/firmware.bin") == 0) {
    handleFirmwareUpload(client, contentLength, expectedSha);
    return;
  }
  if (strcmp(method, "PUT") != 0 || strcmp(target, "/file") != 0 || !validPath(path) || !contentLength || !ensureParent(path)) { reply(client, 400, "REQUEST_INVALID"); client.stop(); return; }
  char temporary[72]{}; snprintf(temporary, sizeof(temporary), "%s.part", path); SD.remove(temporary);
  File output = SD.open(temporary, FILE_WRITE);
  if (!output) { reply(client, 500, "SD_OPEN_FAILED"); client.stop(); return; }
  mbedtls_sha256_context sha; mbedtls_sha256_init(&sha); mbedtls_sha256_starts_ret(&sha, 0);
  uint8_t buffer[4096]; uint32_t received = 0; uint32_t lastData = millis();
  lastProgressPercent_ = 255;
  if (progressCallback_) progressCallback_(path, 0, contentLength, progressContext_);
  while (received < contentLength && millis() - lastData < 15000) {
    const int available = client.available();
    if (available <= 0) { delay(1); continue; }
    const size_t wanted = min<size_t>(sizeof(buffer), min<uint32_t>(available, contentLength - received));
    const int got = client.read(buffer, wanted);
    if (got > 0) {
      if (output.write(buffer, got) != (size_t)got) break;
      mbedtls_sha256_update_ret(&sha, buffer, got);
      received += got;
      lastData = millis();
      const uint8_t percent = static_cast<uint8_t>((received * 100ULL) / contentLength);
      if (progressCallback_ && percent != lastProgressPercent_) {
        lastProgressPercent_ = percent;
        progressCallback_(path, received, contentLength, progressContext_);
      }
    }
  }
  output.flush(); output.close();
  uint8_t digest[32]; mbedtls_sha256_finish_ret(&sha, digest); mbedtls_sha256_free(&sha);
  char actual[65]{}; for (int i = 0; i < 32; ++i) snprintf(actual + i * 2, 3, "%02x", digest[i]);
  if (received != contentLength || (expectedSha[0] && strcasecmp(expectedSha, actual) != 0)) { SD.remove(temporary); reply(client, 422, received != contentLength ? "SIZE_MISMATCH" : "SHA256_MISMATCH"); client.stop(); return; }
  SD.remove(path);
  if (!SD.rename(temporary, path)) { SD.remove(temporary); reply(client, 500, "RENAME_FAILED"); client.stop(); return; }
  // O manifesto enviado pelo app precisa virar o catálogo ativo imediatamente.
  // Sem esta cópia, uma leitura de CATALOG GET antes do próximo boot pode usar
  // o catálogo físico, que não contém títulos, menus ou submenus.
  if (strcmp(path, "/fefo.json") == 0) {
    SD.mkdir("/sys");
    SD.mkdir("/sys/db");
    File source = SD.open("/fefo.json", FILE_READ);
    File active = SD.open("/sys/db/fefo.json", FILE_WRITE);
    if (!source || !active) {
      if (source) source.close();
      if (active) active.close();
      reply(client, 500, "CATALOG_ACTIVATE_FAILED");
      client.stop();
      return;
    }
    uint8_t catalogBuffer[1024];
    while (source.available()) {
      const size_t count = source.read(catalogBuffer, sizeof(catalogBuffer));
      if (count == 0 || active.write(catalogBuffer, count) != count) {
        source.close();
        active.close();
        reply(client, 500, "CATALOG_ACTIVATE_FAILED");
        client.stop();
        return;
      }
    }
    source.close();
    active.close();
  }
  reply(client, 200, "STORED"); client.stop();
}

void WifiTransferService::handleFirmwareUpload(WiFiClient& client,
                                               uint32_t contentLength,
                                               const char* expectedSha) {
  if (!contentLength) {
    reply(client, 400, "FIRMWARE_METADATA_INVALID");
    client.stop();
    return;
  }
  const bool hasExpectedSha = (expectedSha != nullptr && strlen(expectedSha) == 64);

  if (!Update.begin(contentLength, U_FLASH)) {
    reply(client, 500, "OTA_BEGIN_FAILED");
    client.stop();
    return;
  }

  mbedtls_sha256_context sha;
  mbedtls_sha256_init(&sha);
  mbedtls_sha256_starts_ret(&sha, 0);
  constexpr size_t kOtaBufferSize = 2048;
  uint8_t* buffer = static_cast<uint8_t*>(malloc(kOtaBufferSize));
  if (!buffer) {
    Update.abort();
    mbedtls_sha256_free(&sha);
    reply(client, 500, "OTA_NO_MEMORY");
    client.stop();
    return;
  }
  uint32_t received = 0;
  uint32_t lastData = millis();
  lastProgressPercent_ = 255;
  if (progressCallback_) {
    progressCallback_("Firmware OTA", 0, contentLength, progressContext_);
  }
  while (received < contentLength && millis() - lastData < 15000) {
    const int available = client.available();
    if (available <= 0) {
      delay(1);
      continue;
    }
    const size_t wanted = min<size_t>(
        kOtaBufferSize, min<uint32_t>(available, contentLength - received));
    const int got = client.read(buffer, wanted);
    if (got <= 0) continue;
    if (Update.write(buffer, got) != static_cast<size_t>(got)) break;
    mbedtls_sha256_update_ret(&sha, buffer, got);
    received += got;
    lastData = millis();
    const uint8_t percent =
        static_cast<uint8_t>((received * 100ULL) / contentLength);
    if (progressCallback_ && percent != lastProgressPercent_) {
      lastProgressPercent_ = percent;
      progressCallback_("Firmware OTA", received, contentLength,
                        progressContext_);
    }
  }

  uint8_t digest[32];
  mbedtls_sha256_finish_ret(&sha, digest);
  mbedtls_sha256_free(&sha);
  free(buffer);
  char actual[65]{};
  for (int i = 0; i < 32; ++i) {
    snprintf(actual + i * 2, 3, "%02x", digest[i]);
  }
  if (received != contentLength || (hasExpectedSha && strcasecmp(expectedSha, actual) != 0)) {
    Update.abort();
    reply(client, 422,
          received != contentLength ? "OTA_SIZE_MISMATCH"
                                    : "OTA_SHA256_MISMATCH");
    client.stop();
    return;
  }
  if (!Update.end(true)) {
    reply(client, 500, "OTA_FINALIZE_FAILED");
    client.stop();
    return;
  }
  reply(client, 200, "FIRMWARE_READY");
  client.flush();
  client.stop();
}

bool WifiTransferService::validPath(const char* path) const {
  if (!path || strstr(path, "..") || strlen(path) >= 64) return false;
  return strncmp(path, "/usr/a/", 7) == 0 || strncmp(path, "/usr/f/", 7) == 0 || strcmp(path, "/fefo.json") == 0;
}

bool WifiTransferService::ensureParent(const char* path) {
  if (strncmp(path, "/usr/a/", 7) == 0) return (SD.exists("/usr") || SD.mkdir("/usr")) && (SD.exists("/usr/a") || SD.mkdir("/usr/a"));
  if (strncmp(path, "/usr/f/", 7) == 0) return (SD.exists("/usr") || SD.mkdir("/usr")) && (SD.exists("/usr/f") || SD.mkdir("/usr/f"));
  return true;
}

}  // namespace fefo
