#include "modules/update/UpdateService.h"

#include <Arduino.h>
#include <Update.h>

namespace fefo {

bool UpdateService::begin() {
  Serial.println("[UPDATE] OTA BLE habilitado; aguardando sessao segura.");
  return true;
}

bool UpdateService::start(uint32_t expectedSize, const char* md5) {
  cancel();
  if (expectedSize == 0) {
    setError("SIZE_ZERO");
    return false;
  }

  if (!Update.begin(expectedSize, U_FLASH)) {
    snprintf(lastError_, sizeof(lastError_), "BEGIN_%u", Update.getError());
    Serial.printf("[UPDATE] Falha Update.begin: %s\n", lastError_);
    return false;
  }

  if (md5 != nullptr && md5[0] != '\0') {
    if (!Update.setMD5(md5)) {
      Update.abort();
      setError("MD5_INVALID");
      return false;
    }
  }

  active_ = true;
  readyToReboot_ = false;
  expectedSize_ = expectedSize;
  receivedSize_ = 0;
  setError("");
  Serial.printf("[UPDATE] OTA iniciado: %lu bytes.\n",
                static_cast<unsigned long>(expectedSize_));
  return true;
}

size_t UpdateService::write(uint8_t* data, size_t length) {
  if (!active_ || data == nullptr || length == 0) {
    setError("WRITE_NO_SESSION");
    return 0;
  }
  if (receivedSize_ + length > expectedSize_) {
    setError("WRITE_OVERFLOW");
    return 0;
  }

  const size_t written = Update.write(data, length);
  if (written != length) {
    snprintf(lastError_, sizeof(lastError_), "WRITE_%u", Update.getError());
    Serial.printf("[UPDATE] Falha Update.write: %s\n", lastError_);
    return written;
  }

  receivedSize_ += static_cast<uint32_t>(written);
  return written;
}

bool UpdateService::finish() {
  if (!active_) {
    setError("END_NO_SESSION");
    return false;
  }
  if (receivedSize_ != expectedSize_) {
    snprintf(lastError_, sizeof(lastError_), "SIZE_%lu_%lu",
             static_cast<unsigned long>(receivedSize_),
             static_cast<unsigned long>(expectedSize_));
    Update.abort();
    active_ = false;
    return false;
  }

  const bool ok = Update.end(true);
  active_ = false;
  if (!ok) {
    snprintf(lastError_, sizeof(lastError_), "END_%u", Update.getError());
    Serial.printf("[UPDATE] Falha Update.end: %s\n", lastError_);
    return false;
  }

  readyToReboot_ = true;
  setError("");
  Serial.println("[UPDATE] OTA validado. Reinicio liberado por comando.");
  return true;
}

void UpdateService::cancel() {
  if (active_) Update.abort();
  active_ = false;
  expectedSize_ = 0;
  receivedSize_ = 0;
}

void UpdateService::setError(const char* message) {
  if (message == nullptr) message = "";
  strlcpy(lastError_, message, sizeof(lastError_));
}

}  // namespace fefo
