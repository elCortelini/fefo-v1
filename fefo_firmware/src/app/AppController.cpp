#include "app/AppController.h"

#include <Arduino.h>
#include <esp_system.h>
#include <SD.h>
#include <cstring>
#include <esp_task_wdt.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

bool resolveAudioTestPath(const char* sourcePath, char* resolvedPath,
                          size_t resolvedSize);

bool parseNumberArgument(const char* command, const char* keyword,
                         int& value) {
  if (command == nullptr || keyword == nullptr) return false;
  const size_t keywordLength = strlen(keyword);
  if (strncasecmp(command, keyword, keywordLength) != 0) return false;
  const char* cursor = command + keywordLength;
  while (*cursor == ' ' || *cursor == ':' || *cursor == '=' ||
         *cursor == '\t') {
    ++cursor;
  }
  if (*cursor == '\0' || !isDigit(*cursor)) return false;
  value = atoi(cursor);
  return true;
}

const char* skipSeparators(const char* cursor) {
  if (cursor == nullptr) return nullptr;
  while (*cursor == ' ' || *cursor == ':' || *cursor == '=' ||
         *cursor == '\t') {
    ++cursor;
  }
  return cursor;
}

bool consumeWord(const char*& cursor, const char* word) {
  if (cursor == nullptr || word == nullptr) return false;
  cursor = skipSeparators(cursor);
  const size_t length = strlen(word);
  if (strncasecmp(cursor, word, length) != 0) return false;
  const char next = cursor[length];
  if (next != '\0' && next != ' ' && next != ':' && next != '=' &&
      next != '\t') {
    return false;
  }
  cursor += length;
  return true;
}

const char* matchFileBeginPayload(const char* command) {
  const char* cursor = command;
  if (consumeWord(cursor, "FILE") && consumeWord(cursor, "BEGIN")) {
    return skipSeparators(cursor);
  }
  cursor = command;
  if (consumeWord(cursor, "UPLOAD") && consumeWord(cursor, "AUDIO")) {
    return skipSeparators(cursor);
  }
  cursor = command;
  if (consumeWord(cursor, "FB")) {
    return skipSeparators(cursor);
  }
  return nullptr;
}

const char* matchFileDataPayload(const char* command) {
  const char* cursor = command;
  if (consumeWord(cursor, "FILE") && consumeWord(cursor, "DATA")) {
    return skipSeparators(cursor);
  }
  cursor = command;
  if (consumeWord(cursor, "UPLOAD") && consumeWord(cursor, "DATA")) {
    return skipSeparators(cursor);
  }
  cursor = command;
  if (consumeWord(cursor, "FD")) {
    return skipSeparators(cursor);
  }
  return nullptr;
}

const char* matchFileChunkPayload(const char* command) {
  const char* cursor = command;
  if (consumeWord(cursor, "FILE") && consumeWord(cursor, "CHUNK")) {
    return skipSeparators(cursor);
  }
  cursor = command;
  if (consumeWord(cursor, "UPLOAD") && consumeWord(cursor, "CHUNK")) {
    return skipSeparators(cursor);
  }
  cursor = command;
  if (consumeWord(cursor, "FX")) {
    return skipSeparators(cursor);
  }
  return nullptr;
}

int hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

bool decodeHexByte(const char* text, uint8_t& value) {
  const int high = hexNibble(text[0]);
  const int low = hexNibble(text[1]);
  if (high < 0 || low < 0) return false;
  value = static_cast<uint8_t>((high << 4) | low);
  return true;
}

bool sdExistsPath(const char* path) {
  if (path == nullptr || path[0] == '\0') return false;
  if (SD.exists(path)) return true;
  if (path[0] == '/') return SD.exists(path + 1);
  char withSlash[80]{};
  snprintf(withSlash, sizeof(withSlash), "/%s", path);
  return SD.exists(withSlash);
}

bool sdRemovePath(const char* path) {
  if (path == nullptr || path[0] == '\0') return false;
  if (SD.remove(path)) return true;
  if (path[0] == '/') return SD.remove(path + 1);
  char withSlash[80]{};
  snprintf(withSlash, sizeof(withSlash), "/%s", path);
  return SD.remove(withSlash);
}

File sdOpenPath(const char* path, const char* mode) {
  File file = SD.open(path, mode);
  if (file) return file;
  if (path != nullptr && path[0] == '/') {
    return SD.open(path + 1, mode);
  }
  if (path != nullptr && path[0] != '\0') {
    char withSlash[80]{};
    snprintf(withSlash, sizeof(withSlash), "/%s", path);
    return SD.open(withSlash, mode);
  }
  return file;
}

bool sdResolveOpenablePath(const char* path, char* output, size_t outputSize) {
  if (path == nullptr || path[0] == '\0') return false;

  File file = SD.open(path, FILE_READ);
  if (file) {
    file.close();
    strlcpy(output, path, outputSize);
    return true;
  }

  if (path[0] == '/') {
    file = SD.open(path + 1, FILE_READ);
    if (file) {
      file.close();
      strlcpy(output, path + 1, outputSize);
      return true;
    }
  } else {
    char withSlash[80]{};
    snprintf(withSlash, sizeof(withSlash), "/%s", path);
    file = SD.open(withSlash, FILE_READ);
    if (file) {
      file.close();
      strlcpy(output, withSlash, outputSize);
      return true;
    }
  }

  return false;
}

bool ensureUserMediaDirectories() {
  SD.mkdir("/usr");
  SD.mkdir("/usr/a");
  SD.mkdir("/usr/f");
  SD.mkdir("/usr/c");
  SD.mkdir("usr");
  SD.mkdir("usr/a");
  SD.mkdir("usr/f");
  SD.mkdir("usr/c");
  return true;
}

bool isSafeUserMediaPath(const char* path) {
  if (path == nullptr || path[0] == '\0') return false;
  if (strstr(path, "..") != nullptr) return false;
  return strcmp(path, "/fefo.json") == 0 ||
         strcmp(path, "fefo.json") == 0 ||
         strncmp(path, "/usr/a/", 7) == 0 ||
         strncmp(path, "/usr/f/", 7) == 0 ||
         strncmp(path, "/usr/c/", 7) == 0 ||
         strncmp(path, "usr/a/", 6) == 0 ||
         strncmp(path, "usr/f/", 6) == 0 ||
         strncmp(path, "usr/c/", 6) == 0;
}

void buildUserMediaPath(const char* nameOrPath, char* output, size_t outputSize) {
  if (nameOrPath == nullptr || nameOrPath[0] == '\0') {
    output[0] = '\0';
    return;
  }
  if (nameOrPath[0] == '/') {
    strlcpy(output, nameOrPath, outputSize);
  } else if (strncmp(nameOrPath, "usr/a/", 6) == 0 ||
             strncmp(nameOrPath, "usr/f/", 6) == 0 ||
             strncmp(nameOrPath, "usr/c/", 6) == 0) {
    snprintf(output, outputSize, "/%s", nameOrPath);
  } else {
    snprintf(output, outputSize, "/usr/a/%s", nameOrPath);
  }
  if (strncmp(output, "/usr/a/", 7) == 0 &&
      strstr(output, ".wav") == nullptr) {
    strlcat(output, ".wav", outputSize);
  }
}

}  // namespace

void AppController::begin() {
  Serial.begin(115200);
  delay(300);
  randomSeed(micros());
  Serial.printf("\n[APP] Iniciando FEFO %s.\n", board::kFirmwareVersion);
  Serial.printf("[RESET] Motivo do ultimo reset: %d.\n",
                static_cast<int>(esp_reset_reason()));
  beginWatchdog();
  lastUserActivityMs_ = millis();

  transitionTo(SystemState::kSelfTest);

  // Inicializa apenas o necessário para o teste de áudio SD.
  vibration_.begin();
  leds_.begin();
  if (board::kAudioEnabled) {
    audio_.begin();
    audio_.setSirenLocked(true);
  } else {
    Serial.println("[AUDIO] Desabilitado nesta versao.");
    dacWrite(board::kAudioOutput, 0);
  }
  // Travar a sirene por padrão durante diagnósticos para evitar ruído
  audio_.setSirenLocked(true);
  vibration_.stop();
  audio_.stop();

  display_.begin();
  wifiTransfer_.setProgressCallback(&AppController::handleWifiProgress, this);
  microphoneReady_ = false;
  microphoneActive_ = false;
  panic_.begin();
  const bool storageReady = storage_.begin();
  const bool bleReady = ble_.begin();
  if (storageReady) {
    loadConfigFromSd(false);
    logEvent("boot", board::kFirmwareVersion);
  }

  // Em diagnostico, manter a tela fixa no painel BLE para facilitar leitura de
  // comandos e erros. Com DIAG OFF, o modo salvo volta a comandar faces/painel.
  if (diagnosticMode_) {
    blePanelActive_ = true;
    faceCyclingActive_ = false;
  }
  // Definir volume máximo para teste (temporário)
  if (board::kAudioEnabled && board::kAudioBootTestEnabled) {
    audio_.setVolumePercent(100);
    Serial.println("[AUDIO TEST] Volume temporario definido para 100% para diagnostico.");
  }
  lastAudioProgress_ = 255;
  lastAudioFile_[0] = '\0';
  lastAudioDisplayMs_ = 0;
  if (storageReady) {
    scanAudioTestFiles();
    buildCatalogJson();
    if (board::kAudioEnabled && board::kAudioBootTestEnabled) {
      startAudioTestSequence();
    }
    // As faces continuam sendo escaneadas para LIST FACES, mas nao sao exibidas
    // automaticamente nesta versao de diagnostico.
    if (scanFaceFiles()) {
      currentFaceIndex_ = 0;
      lastFaceChangeMs_ = millis();
      if (preferredFacesMode_ && faceFileCount_ > 0) {
        currentFaceIndex_ = random(faceFileCount_);
        display_.showFaceFile(faceFiles_[currentFaceIndex_]);
        faceCyclingActive_ = true;
        blePanelActive_ = false;
      }
    }
  }

  transitionTo(storageReady && bleReady ? SystemState::kReady
                                        : SystemState::kDegraded);
  diagnostics_.printBootReport(state_, storageReady);
  if (blePanelActive_) {
    updateBlePanel(true);
  } else if (!faceCyclingActive_) {
    display_.beginVuMeter(microphoneReady_, microphone_.noiseFloorRms());
  }
}

void AppController::handleWifiProgress(const char* path, uint32_t received,
                                       uint32_t total, void* context) {
  if (!context) return;
  static_cast<AppController*>(context)->display_.showWifiTransfer(
      path, received, total);
}

void AppController::update() {
  feedWatchdog();
  if (wifiPushScheduled_ && static_cast<int32_t>(millis() - wifiPushAtMs_) >= 0) {
    wifiPushScheduled_ = false;
    audio_.stopPlayback();
    // BLE + Wi-Fi excedem a RAM interna desta CYD (sem PSRAM). A desalocacao do
    // BLE pode levar mais que os 8 s do watchdog, portanto removemos o loop do
    // WDT antes da transicao e reiniciamos ao final da operacao.
    if (watchdogReady_) {
      esp_task_wdt_delete(nullptr);
      watchdogReady_ = false;
    }
    ble_.shutdown();
    delay(300);
    Serial.printf("[WIFI PUSH] Heap apos desligar BLE: %u bytes.\n", ESP.getFreeHeap());
    wifiTransfer_.runPushServer();
    delay(250);
    ESP.restart();
  }

  bool microphoneSampled = false;
  MicrophoneReading reading;
  uint32_t nowMs = millis();

  char bleCommand[256]{};
  if (ble_.takeCommand(bleCommand, sizeof(bleCommand))) {
    handleBleCommand(bleCommand);
  }
  nowMs = millis();
  updateIdleMicrophone(nowMs);
  updateBlePanel();
  updateFaces(nowMs);

  if (!audioTestActive_) {
    if (microphoneActive_ && microphoneReady_ &&
        nowMs - lastMicrophoneUpdateMs_ >= 40) {
      lastMicrophoneUpdateMs_ = nowMs;
      reading = microphone_.read();
      latestMicrophoneLevelPercent_ = reading.levelPercent;
      microphoneSampled = true;
    }

    // A regra é atualizada em todo loop para que os prazos não dependam da taxa
    // de desenho da tela. Se o microfone falhar, o nível seguro é sempre zero.
    nowMs = millis();
    // O modo pânico apenas coordena módulos independentes. Ele recebe o nível do
    // MAX9814 e comanda os serviços de vibração e áudio sem conhecer seus GPIOs.
    panic_.update((microphoneActive_ && microphoneReady_)
                      ? latestMicrophoneLevelPercent_
                      : 0,
                  nowMs, vibration_, audio_);
  } else {
    // Durante o teste de áudio SD, desativa o pânico e ignora o microfone para
    // evitar falsos disparos enquanto a reprodução estiver em andamento.
    panic_.update(0, nowMs, vibration_, audio_);
  }

  const bool motorActive = vibration_.active();
  if (manualVibrationActive_) {
    if (!motorActive) {
      manualVibrationActive_ = false;
      vibration_.clearSafetyLockout();
    } else {
      audio_.setSirenActive(false);
    }
  }
  leds_.update(nowMs, panic_.active(), audio_.playbackActive(),
               audio_.playbackLevelPercent());

  if (audioTestActive_) {
    const bool active = audio_.playbackActive();
    if (!active && audioTestPlaybackPending_) {
      audioTestPlaybackPending_ = false;
      currentAudioIndex_++;
    }
    if (!active && !audioTestPlaybackPending_) {
      if (!startNextAudioTest()) {
        audioTestActive_ = false;
      }
    }
    if (audio_.playbackActive()) {
      const uint32_t total = audio_.playbackSize();
      const uint32_t current = audio_.playbackPosition();
      const uint8_t progress =
          total == 0 ? 0
                      : static_cast<uint8_t>((current * 100 + total / 2) / total);
      uint32_t nowMsLocal = millis();
      const bool fileChanged = strcmp(audio_.playbackFileName(), lastAudioFile_) != 0;
      // Não sobrescreve a exibição das faces enquanto o ciclo de faces estiver ativo
      if (!faceCyclingActive_ && (fileChanged || progress != lastAudioProgress_ ||
          nowMsLocal - lastAudioDisplayMs_ > 200)) {
        lastAudioDisplayMs_ = nowMsLocal;
        lastAudioProgress_ = progress;
        strlcpy(lastAudioFile_, audio_.playbackFileName(), sizeof(lastAudioFile_));
        display_.showAudioPlayback(audio_.playbackFileName(), progress,
                                   audio_.volumePercent());
      }
    }
  }

  if (!audioTestActive_ && audioLoop_ && !audio_.playbackActive() &&
      !audioPaused_ && currentAudioPath_[0] != '\0') {
      audio_.playWavFile(currentAudioPath_);
  }

  // Se estivermos no teste de audio (ou ciclo de faces ativo) e houver
  // faces carregadas, cicla-as
  if (microphoneSampled) {
    if (faceFileCount_ == 0) {
      display_.showVuMeter(reading.levelPercent, reading.peakPercent, reading.rms,
                           reading.bias, reading.peakToPeak, reading.clipping,
                           motorActive);
    }

    if (nowMs - lastMicrophoneLogMs_ >= 1000) {
      lastMicrophoneLogMs_ = nowMs;
      const uint8_t activeSegments = static_cast<uint8_t>(
          (reading.levelPercent * board::kVuSegmentCount + 99) / 100);
      const char* sirenState = audio_.sirenActive()
                                    ? "ON"
                                    : (audio_.sirenAudible() ? "FADE" : "OFF");
      Serial.printf(
          "[MIC] nivel=%u%% barras=%u/%u pico=%u%% rms=%u p-p=%u bias=%u "
          "panico=%s motor=%s sirene=%s%s\n",
          reading.levelPercent, activeSegments, board::kVuSegmentCount,
          reading.peakPercent, reading.rms, reading.peakToPeak, reading.bias,
          panicStateName(panic_.state()),
          motorActive ? "ON" : "OFF", sirenState,
          reading.clipping ? " SATURADO" : "");
    }
  }
  // Gatilho serial para testes manuais: 't' -> selfTest da sirene
  if (Serial.available()) {
    int c = Serial.read();
    if (c == 't' || c == 'T') {
      if (!board::kAudioEnabled) {
        Serial.println("[AUDIO TEST] Ignorado: audio desabilitado nesta versao.");
      } else if (faceCyclingActive_) {
        Serial.println("[AUDIO TEST] Autoteste ignorado: faces ativas.");
      } else if (audio_.sirenLocked()) {
        Serial.println("[AUDIO TEST] Autoteste ignorado: sirene travada.");
      } else {
        Serial.println("[AUDIO TEST] Self-test manual solicitado.");
        audio_.selfTest();
      }
    } else if (c == 'f' || c == 'F') {
      Serial.println("[FACES] Forcando varredura de faces e parando audio.");
      audio_.stop();
      audioTestActive_ = false;
      if (scanFaceFiles()) {
        currentFaceIndex_ = 0;
        lastFaceChangeMs_ = millis();
        if (faceFileCount_ > 0) {
          faceCyclingActive_ = true;
          display_.showFaceFile(faceFiles_[currentFaceIndex_]);
        }
      } else {
        Serial.println("[FACES] Nenhuma face encontrada.");
      }
    } else if (c == 'p' || c == 'P') {
      Serial.println("[AUDIO TEST] Audio desabilitado/parado (comando serial).");
      audio_.stop();
      audioTestActive_ = false;
    } else if (c == 'o' || c == 'O') {
      Serial.println("[FACES] Parando ciclo de faces (comando serial).");
      faceCyclingActive_ = false;
    } else if (c == 'z' || c == 'Z') {
      if (!board::kAudioEnabled) {
        Serial.println("[AUDIO] Sirene indisponivel: audio desabilitado nesta versao.");
      } else {
        const bool locked = !audio_.sirenLocked();
        audio_.setSirenLocked(locked);
        Serial.printf("[AUDIO] Sirene %s (comando serial).\n",
                      locked ? "TRAVADA" : "DESTRAVADA");
      }
    } else if (c == 'l' || c == 'L') {
      Serial.println("[SD] Listando raiz e /sys/f para diagnostico:");
      File root = SD.open("/");
      if (!root) {
        Serial.println("[SD] Falha ao abrir raiz do SD.");
      } else {
        File e = root.openNextFile();
        while (e) {
          if (e.isDirectory()) Serial.printf("[SD] DIR  %s\n", e.name());
          else Serial.printf("[SD] FILE %s (%u bytes)\n", e.name(), (unsigned)e.size());
          e.close();
          e = root.openNextFile();
        }
        root.close();
      }
      const char* probe = "/sys/f";
      File fdir = SD.open(probe);
      if (!fdir || !fdir.isDirectory()) {
        Serial.printf("[SD] %s nao existe ou nao e um diretorio.\n", probe);
        if (fdir) fdir.close();
      } else {
        File e = fdir.openNextFile();
        while (e) {
          Serial.printf("[SD] /sys/f -> %s %u\n", e.name(), (unsigned)e.size());
          e.close();
          e = fdir.openNextFile();
        }
        fdir.close();
      }
    } else if (c == 'v' || c == 'V') {
      if (!board::kAudioEnabled) {
        Serial.println("[AUDIO TEST] Volume ignorado: audio desabilitado nesta versao.");
      } else {
        audio_.setVolumePercent(100);
        Serial.println("[AUDIO TEST] Volume definido para 100% (manual).");
      }
    } else if (c == 'b' || c == 'B') {
      Serial.println("[AUDIO TEST] Tocando /sys/a/inf1.wav por comando serial.");
      playAudioFromBleToken("/sys/a/inf1.wav");
    }
  }
  delay(5);
}

void AppController::beginWatchdog() {
  const esp_err_t initResult =
      esp_task_wdt_init(board::kWatchdogTimeoutSeconds, true);
  if (initResult != ESP_OK && initResult != ESP_ERR_INVALID_STATE) {
    Serial.printf("[WDT] Falha ao iniciar watchdog: %d\n",
                  static_cast<int>(initResult));
    return;
  }

  const esp_err_t addResult = esp_task_wdt_add(nullptr);
  if (addResult != ESP_OK && addResult != ESP_ERR_INVALID_STATE) {
    Serial.printf("[WDT] Falha ao registrar loop principal: %d\n",
                  static_cast<int>(addResult));
    return;
  }

  watchdogReady_ = true;
  Serial.printf("[WDT] Watchdog ativo: %lu s.\n",
                static_cast<unsigned long>(board::kWatchdogTimeoutSeconds));
}

void AppController::feedWatchdog() {
  if (watchdogReady_) esp_task_wdt_reset();
}

void AppController::handleBleCommand(const char* command) {
  if (command == nullptr || command[0] == '\0') return;

  char cleanedCommand[256]{};
  strlcpy(cleanedCommand, command, sizeof(cleanedCommand));
  char* start = cleanedCommand;
  while (*start == ' ' || *start == '\r' || *start == '\n' || *start == '\t') {
    ++start;
  }
  char* end = start + strlen(start);
  while (end > start &&
         (end[-1] == ' ' || end[-1] == '\r' || end[-1] == '\n' ||
          end[-1] == '\t')) {
    *--end = '\0';
  }
  if (start[0] == '\0') return;

  noteUserActivity();
  blePanelActive_ = true;
  ++bleCommandCount_;
  strlcpy(lastBleCommand_, start, sizeof(lastBleCommand_));
  logEvent("ble_cmd", start);
  updateBlePanel(true);

  if (strcasecmp(start, "PING") == 0) {
    sendBleLine("OK PONG");
    return;
  }

  if (strcasecmp(start, "HELP") == 0 || strcmp(start, "?") == 0) {
    sendBleHelp();
    return;
  }

  if (strcasecmp(start, "STATUS") == 0 || strcasecmp(start, "ST") == 0) {
    sendBleStatus();
    return;
  }

  if (strcasecmp(start, "SD INFO") == 0 || strcasecmp(start, "SDINFO") == 0) {
    sendSdInfo();
    return;
  }

  if (handleConfigCommand(start)) {
    return;
  }

  if (handleDiagCommand(start) || handlePanicCommand(start) ||
      handleDeviceCommand(start) || handleLogCommand(start) ||
      handleMediaCommand(start) || handleFileCommand(start) ||
      handleAppCommand(start) ||
      handleAdvancedPlayCommand(start)) {
    return;
  }

  if (strcasecmp(start, "LIST AUDIO") == 0 ||
      strcasecmp(start, "AUDIO LIST") == 0 ||
      strcasecmp(start, "LIST:AUDIO") == 0 ||
      strcasecmp(start, "LA") == 0) {
    sendBleAudioList();
    return;
  }

  if (strcasecmp(start, "LIST FACES") == 0 ||
      strcasecmp(start, "FACE LIST") == 0 ||
      strcasecmp(start, "LIST:FACES") == 0 ||
      strcasecmp(start, "LF") == 0) {
    sendBleFaceList();
    return;
  }

  if (strcasecmp(start, "TREE") == 0 || strcasecmp(start, "SD TREE") == 0) {
    sendBleTree();
    return;
  }

  if (handleModeCommand(start) || handleFaceCommand(start) ||
      handleVolumeCommand(start) || handleBrightnessCommand(start) ||
      handleLedPatternCommand(start) || handleVibrationCommand(start) ||
      handleSeekCommand(start)) {
    return;
  }

  if (strcasecmp(start, "AUDIO STATUS") == 0 ||
      strcasecmp(start, "PLAY STATUS") == 0) {
    char line[180]{};
    const uint32_t position = audio_.playbackPosition();
    const uint32_t size = audio_.playbackSize();
    const uint32_t posSec = position / 32000;
    const uint32_t totalSec = size / 32000;
    snprintf(line, sizeof(line),
             "OK AUDIO STATE=%s FILE=%s POS=%lu SIZE=%lu POS_SEC=%lu TOTAL_SEC=%lu VOL=%u",
             audio_.playbackActive() ? "PLAYING" :
                 (audioPaused_ ? "PAUSED" : "IDLE"),
             currentAudioPath_[0] != '\0' ? currentAudioPath_ : "-",
             static_cast<unsigned long>(position),
             static_cast<unsigned long>(size),
             static_cast<unsigned long>(posSec),
             static_cast<unsigned long>(totalSec),
             audio_.volumePercent());
    sendBleLine(line);
    return;
  }

  if (strcmp(start, "S") == 0 || strcasecmp(start, "STOP") == 0 ||
      strcasecmp(start, "AUDIO:STOP") == 0) {
    audio_.stopPlayback();
    audioTestActive_ = false;
    audioTestPlaybackPending_ = false;
    audioPaused_ = false;
    pausedAudioPath_[0] = '\0';
    pausedAudioOffset_ = 0;
    Serial.println("[BLE] Audio parado por comando.");
    sendBleLine("OK STOP");
    logEvent("audio_stop", "ble");
    return;
  }

  if (strcasecmp(start, "PAUSE") == 0 || strcasecmp(start, "PAUSA") == 0) {
    strlcpy(pausedAudioPath_, currentAudioPath_[0] != '\0' ? currentAudioPath_ : "",
            sizeof(pausedAudioPath_));
    pausedAudioOffset_ = audio_.playbackPosition();
    audio_.stopPlayback();
    audioTestActive_ = false;
    audioTestPlaybackPending_ = false;
    audioPaused_ = true;
    Serial.println("[BLE] Audio pausado por comando.");
    sendBleLine("OK PAUSE");
    logEvent("audio_pause", pausedAudioPath_);
    return;
  }

  if (strcasecmp(start, "RESUME") == 0 || strcasecmp(start, "RETOMAR") == 0) {
    if (!audioPaused_ || pausedAudioPath_[0] == '\0') {
      sendBleLine("ERR RESUME NO_PAUSE");
      return;
    }
    audioPaused_ = false;
    const bool resumed =
        audio_.playWavFileFrom(pausedAudioPath_, pausedAudioOffset_);
    char line[96]{};
    snprintf(line, sizeof(line), "%s RESUME %s",
             resumed ? "OK" : "ERR", pausedAudioPath_);
    sendBleLine(line);
    if (resumed) logEvent("audio_resume", pausedAudioPath_);
    return;
  }

  const char* token = nullptr;
  if (strncasecmp(start, "P:", 2) == 0 ||
      strncasecmp(start, "P.", 2) == 0 ||
      strncasecmp(start, "P=", 2) == 0 ||
      strncasecmp(start, "P ", 2) == 0) {
    token = start + 2;
  } else if (strncasecmp(start, "PLAY:", 5) == 0) {
    token = start + 5;
  } else if (strncasecmp(start, "PLAY ", 5) == 0) {
    token = start + 5;
  } else if (strncasecmp(start, "AUDIO:PLAY:", 11) == 0) {
    token = start + 11;
  } else if (strncasecmp(start, "AUDIO PLAY ", 11) == 0) {
    token = start + 11;
  }

  if (token == nullptr || token[0] == '\0') {
    Serial.printf("[BLE] Comando desconhecido: %s\n", start);
    sendBleLine("ERR UNKNOWN USE HELP");
    return;
  }

  const bool played = playAudioFromBleToken(token);
  if (played) audioPaused_ = false;
  char response[120]{};
  if (played) {
    snprintf(response, sizeof(response), "OK PLAY %s", token);
  } else {
    snprintf(response, sizeof(response), "ERR PLAY %s %s", token,
             lastPlayError_[0] == '\0' ? "FAILED" : lastPlayError_);
  }
  sendBleLine(response);
  if (played) logEvent("audio_play", token);
}

void AppController::sendBleLine(const char* line) {
  if (line == nullptr || line[0] == '\0') return;
  feedWatchdog();
  ++bleResponseCount_;
  strlcpy(lastBleResponse_, line, sizeof(lastBleResponse_));
  ble_.sendLine(line);
  // Sincronizações longas podem transmitir dezenas de linhas. Atualizar o TFT
  // para cada pacote bloqueava o loop principal até o watchdog reiniciar o pet.
  updateBlePanel(false);
  feedWatchdog();
}

void AppController::sendBleStatus() {
  char line[220]{};
  const char* audioState = audio_.playbackActive() ? "PLAYING" : "IDLE";
  const char* sdState = storage_.available() ? "OK" : "ERR";
  const char* micState =
      microphoneActive_ ? (microphoneReady_ ? "ON" : "ERR") : "OFF";
  const uint32_t idleMs = millis() - lastUserActivityMs_;

  analogReadResolution(12);
  uint32_t rawSum = 0;
  for (int i = 0; i < 8; ++i) {
    rawSum += analogRead(board::kBatterySensor);
    delayMicroseconds(100);
  }
  uint32_t rawAvg = rawSum / 8;
  float voltagePin = (rawAvg / 4095.0f) * 3.3f;
  float voltageBat = voltagePin * 2.0f;
  uint8_t batPct = 100;
  if (voltageBat >= 4.15f) {
    batPct = 100;
  } else if (voltageBat <= 3.30f) {
    batPct = 0;
  } else {
    batPct = static_cast<uint8_t>(((voltageBat - 3.30f) / (4.15f - 3.30f)) * 100.0f);
  }

  snprintf(line, sizeof(line),
           "OK STATUS FW=%s BLE=%s SD=%s AUDIO=%s FILE=%s MIC=%s PANIC=%s "
           "IDLE_MS=%lu VOL=%u BRILHO=%u LED=%u VIBRA=%s DIAG=%s "
           "PANIC_EN=%s PANIC_LEVEL=%u BAT=%u%%",
           board::kFirmwareVersion, ble_.connected() ? "CONNECTED" : "WAITING",
           sdState, audioPaused_ ? "PAUSED" : audioState,
           audio_.playbackActive() ? audio_.playbackFileName() : "-",
           micState, panic_.active() ? "ON" : "OFF",
           static_cast<unsigned long>(idleMs), audio_.volumePercent(),
           leds_.brightnessPercent(), leds_.pattern(),
           vibration_.active() ? "ON" : "OFF",
           diagnosticMode_ ? "ON" : "OFF",
           panic_.enabled() ? "ON" : "OFF", panic_.triggerPercent(),
           batPct);
  sendBleLine(line);
}

void AppController::sendBleAudioList() {
  if (!storage_.available() && !storage_.begin()) {
    sendBleLine("ERR LIST AUDIO SD_UNAVAILABLE");
    return;
  }

  scanAudioTestFiles();
  char line[120]{};
  snprintf(line, sizeof(line), "BEGIN AUDIO COUNT=%u",
           static_cast<unsigned>(audioTestFileCount_));
  sendBleLine(line);

  for (size_t index = 0; index < audioTestFileCount_; ++index) {
    snprintf(line, sizeof(line), "AUDIO %u %s",
             static_cast<unsigned>(index + 1), audioTestFiles_[index]);
    sendBleLine(line);
  }

  sendBleLine("END AUDIO");
}

void AppController::sendBleFaceList() {
  if (!storage_.available() && !storage_.begin()) {
    sendBleLine("ERR LIST FACES SD_UNAVAILABLE");
    return;
  }

  scanFaceFiles();
  char line[120]{};
  snprintf(line, sizeof(line), "BEGIN FACES COUNT=%u",
           static_cast<unsigned>(faceFileCount_));
  sendBleLine(line);

  for (size_t index = 0; index < faceFileCount_; ++index) {
    snprintf(line, sizeof(line), "FACE %u %s",
             static_cast<unsigned>(index + 1), faceFiles_[index]);
    sendBleLine(line);
  }

  sendBleLine("END FACES");
}

void AppController::sendBleTree() {
  if (!storage_.available() && !storage_.begin()) {
    sendBleLine("ERR TREE SD_UNAVAILABLE");
    return;
  }

  sendBleLine("BEGIN TREE");
  uint16_t linesSent = 0;
  sendBleTreeRecursive("/", 0, linesSent);
  sendBleLine(linesSent >= 120 ? "END TREE TRUNCATED" : "END TREE");
}

void AppController::sendBleTreeRecursive(const char* directory, int depth,
                                         uint16_t& linesSent) {
  if (directory == nullptr || depth > 5 || linesSent >= 120) return;
  File dir = SD.open(directory);
  if (!dir || !dir.isDirectory()) {
    if (dir) dir.close();
    return;
  }

  File entry = dir.openNextFile();
  while (entry && linesSent < 120) {
    const bool isDirectory = entry.isDirectory();
    const char* name = entry.name();
    char line[150]{};
    snprintf(line, sizeof(line), "TREE %*s%s%s %lu", depth * 2, "",
             isDirectory ? "[D] " : "[F] ", name,
             isDirectory ? 0UL : static_cast<unsigned long>(entry.size()));
    sendBleLine(line);
    ++linesSent;

    if (isDirectory && depth < 5) {
      char childPath[kMaxAudioTestPathLength]{};
      if (strcmp(directory, "/") == 0) {
        snprintf(childPath, sizeof(childPath), "/%s", name);
      } else {
        snprintf(childPath, sizeof(childPath), "%s/%s", directory, name);
      }
      entry.close();
      sendBleTreeRecursive(childPath, depth + 1, linesSent);
    } else {
      entry.close();
    }
    entry = dir.openNextFile();
  }
  dir.close();
}

void AppController::sendSdInfo() {
  if (!storage_.available() && !storage_.begin()) {
    sendBleLine("ERR SD INFO UNAVAILABLE");
    return;
  }

  const uint64_t total = SD.totalBytes();
  const uint64_t used = SD.usedBytes();
  const uint64_t freeBytes = total > used ? total - used : 0;
  char line[150]{};
  snprintf(line, sizeof(line), "OK SD TOTAL=%llu USED=%llu FREE=%llu",
           total, used, freeBytes);
  sendBleLine(line);
}

void AppController::sendBleHelp() {
  sendBleLine("OK HELP PING STATUS LIST AUDIO LIST FACES TREE PLAY <audio>");
  sendBleLine("OK HELP FACE <n|random|path> MODE FACES MODE BLE PAUSE RESUME STOP");
  sendBleLine("OK HELP PLAY RANDOM|NEXT|PREV|LOOP ON|LOOP OFF");
  sendBleLine("OK HELP VOL 0-100 BRILHO 0-100 LED 1-10 VIBRA 1-5");
  sendBleLine("OK HELP CONFIG GET|SET <key> <value>|SAVE|LOAD SD INFO");
  sendBleLine("OK HELP PANIC ON|OFF|STATUS|SET LEVEL|SET IDLE DIAG ON|OFF");
  sendBleLine("OK HELP DEVICE LOG MEDIA CATALOG FILE UPLOAD DELETE");
  sendBleLine("OK HELP FB <file> <bytes> FX <seq> <hex> <sum8> FE FS");
  sendBleLine("OK HELP WIFI PUSH START; OTA VIA WIFI");
  sendBleLine("OK HELP APP HELLO|CAPS|STATE|SYNC");
  sendBleLine("OK HELP ALIASES=VOL?,BRILHO?,LED?,VIBRA?,P.inf1");
}

bool AppController::handleDiagCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "DIAG?") == 0 ||
      strcasecmp(command, "DIAG STATUS") == 0) {
    sendBleLine(diagnosticMode_ ? "OK DIAG ON" : "OK DIAG OFF");
    return true;
  }
  if (strcasecmp(command, "DIAG ON") == 0) {
    diagnosticMode_ = true;
    blePanelActive_ = true;
    faceCyclingActive_ = false;
    updateBlePanel(true);
    sendBleLine("OK DIAG ON");
    logEvent("diag", "on");
    return true;
  }
  if (strcasecmp(command, "DIAG OFF") == 0) {
    diagnosticMode_ = false;
    if (preferredFacesMode_ && faceFileCount_ > 0) {
      blePanelActive_ = false;
      faceCyclingActive_ = true;
      lastFaceChangeMs_ = 0;
    }
    sendBleLine("OK DIAG OFF");
    logEvent("diag", "off");
    return true;
  }
  return false;
}

bool AppController::handlePanicCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "PANIC") == 0 ||
      strcasecmp(command, "PANIC TRIGGER") == 0 ||
      strcasecmp(command, "PANICO") == 0) {
    const bool triggered =
        panic_.triggerManual(millis(), vibration_, audio_);
    sendBleLine(triggered ? "OK PANIC TRIGGER" : "ERR PANIC TRIGGER");
    logEvent("panic", triggered ? "manual" : "manual_failed");
    return true;
  }
  if (strcasecmp(command, "PANIC STATUS") == 0 ||
      strcasecmp(command, "PANICO STATUS") == 0 ||
      strcasecmp(command, "PANIC?") == 0) {
    char line[120]{};
    snprintf(line, sizeof(line), "OK PANIC EN=%s STATE=%s LEVEL=%u IDLE_MS=%lu",
             panic_.enabled() ? "ON" : "OFF", panicStateName(panic_.state()),
             panic_.triggerPercent(),
             static_cast<unsigned long>(panic_.idleDelayMs()));
    sendBleLine(line);
    return true;
  }
  if (strcasecmp(command, "PANIC ON") == 0 ||
      strcasecmp(command, "PANICO ON") == 0) {
    panic_.setEnabled(true);
    sendBleLine("OK PANIC ON");
    logEvent("panic", "on");
    return true;
  }
  if (strcasecmp(command, "PANIC OFF") == 0 ||
      strcasecmp(command, "PANICO OFF") == 0) {
    panic_.setEnabled(false);
    sendBleLine("OK PANIC OFF");
    logEvent("panic", "off");
    return true;
  }

  int value = -1;
  if (strncasecmp(command, "PANIC SET LEVEL", 15) == 0 ||
      strncasecmp(command, "PANIC LEVEL", 11) == 0) {
    const char* cursor = strrchr(command, ' ');
    value = cursor == nullptr ? -1 : atoi(cursor + 1);
    if (value < 0 || value > 100) {
      sendBleLine("ERR PANIC LEVEL RANGE 0-100");
      return true;
    }
    panic_.setTriggerPercent(static_cast<uint8_t>(value));
    sendBleLine("OK PANIC LEVEL");
    return true;
  }

  if (strncasecmp(command, "PANIC SET IDLE", 14) == 0 ||
      strncasecmp(command, "PANIC IDLE", 10) == 0) {
    const char* cursor = strrchr(command, ' ');
    value = cursor == nullptr ? -1 : atoi(cursor + 1);
    if (value < 10 || value > 3600) {
      sendBleLine("ERR PANIC IDLE RANGE 10-3600");
      return true;
    }
    panic_.setIdleDelayMs(static_cast<uint32_t>(value) * 1000UL);
    sendBleLine("OK PANIC IDLE");
    return true;
  }

  return false;
}

bool AppController::handleDeviceCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "DEVICE") == 0 ||
      strcasecmp(command, "DEVICE STATUS") == 0 ||
      strcasecmp(command, "DEVICE?") == 0) {
    char line[120]{};
    snprintf(line, sizeof(line), "OK DEVICE ID=%s NAME=%s FW=%s",
             deviceId_, deviceName_, board::kFirmwareVersion);
    sendBleLine(line);
    return true;
  }

  const char* value = nullptr;
  if (strncasecmp(command, "DEVICE SET ID ", 14) == 0) {
    value = command + 14;
    strlcpy(deviceId_, value, sizeof(deviceId_));
    sendBleLine("OK DEVICE ID");
    return true;
  }
  if (strncasecmp(command, "DEVICE SET NAME ", 16) == 0) {
    value = command + 16;
    strlcpy(deviceName_, value, sizeof(deviceName_));
    sendBleLine("OK DEVICE NAME");
    return true;
  }

  return false;
}

bool AppController::handleLogCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "LOG STATUS") == 0 || strcasecmp(command, "LOG?") == 0) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR LOG SD_UNAVAILABLE");
      return true;
    }
    File file = SD.open("/sys/log/events.log", FILE_READ);
    char line[80]{};
    snprintf(line, sizeof(line), "OK LOG SIZE=%lu",
             file ? static_cast<unsigned long>(file.size()) : 0UL);
    if (file) file.close();
    sendBleLine(line);
    return true;
  }

  if (strcasecmp(command, "LOG CLEAR") == 0) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR LOG SD_UNAVAILABLE");
      return true;
    }
    SD.remove("/sys/log/events.log");
    sendBleLine("OK LOG CLEAR");
    return true;
  }

  if (strcasecmp(command, "LOG READ") == 0) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR LOG SD_UNAVAILABLE");
      return true;
    }
    File file = SD.open("/sys/log/events.log", FILE_READ);
    if (!file) {
      sendBleLine("ERR LOG NOT_FOUND");
      return true;
    }
    sendBleLine("BEGIN LOG");
    uint8_t sent = 0;
    while (file.available() && sent < 20) {
      char line[150]{};
      const size_t length = file.readBytesUntil('\n', line, sizeof(line) - 1);
      line[length] = '\0';
      if (line[0] != '\0') sendBleLine(line);
      ++sent;
    }
    file.close();
    sendBleLine(sent >= 20 ? "END LOG TRUNCATED" : "END LOG");
    return true;
  }

  return false;
}

bool AppController::handleMediaCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "MEDIA INDEX") == 0 ||
      strcasecmp(command, "MEDIA REINDEX") == 0) {
    sendBleLine(buildMediaIndex() ? "OK MEDIA INDEX" : "ERR MEDIA INDEX");
    return true;
  }
  if (strcasecmp(command, "MEDIA STATUS") == 0 ||
      strcasecmp(command, "MEDIA?") == 0) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR MEDIA SD_UNAVAILABLE");
      return true;
    }
    File file = SD.open("/sys/db/media.idx", FILE_READ);
    char line[80]{};
    snprintf(line, sizeof(line), "OK MEDIA INDEX_SIZE=%lu",
             file ? static_cast<unsigned long>(file.size()) : 0UL);
    if (file) file.close();
    sendBleLine(line);
    return true;
  }
  if (strcasecmp(command, "CATALOG BUILD") == 0 ||
      strcasecmp(command, "CATALOG REBUILD") == 0) {
    sendBleLine(buildCatalogJson() ? "OK CATALOG BUILD /sys/db/fefo.json"
                                   : "ERR CATALOG BUILD");
    return true;
  }
  if (strcasecmp(command, "CATALOG STATUS") == 0 ||
      strcasecmp(command, "CATALOG?") == 0) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR CATALOG SD_UNAVAILABLE");
      return true;
    }
    File file = SD.open("/fefo.json", FILE_READ);
    if (!file) file = SD.open("/sys/db/fefo.json", FILE_READ);
    char line[90]{};
    snprintf(line, sizeof(line), "OK CATALOG SIZE=%lu",
             file ? static_cast<unsigned long>(file.size()) : 0UL);
    if (file) file.close();
    sendBleLine(line);
    return true;
  }
  if (strcasecmp(command, "CATALOG GET") == 0) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR CATALOG SD_UNAVAILABLE");
      return true;
    }
    // O manifesto da raiz contém títulos e menus definidos pelo catálogo.
    // Mantém o catálogo gerado pelo firmware como fallback para cartões antigos.
    File file = SD.open("/fefo.json", FILE_READ);
    if (!file) file = SD.open("/sys/db/fefo.json", FILE_READ);
    if (!file) {
      sendBleLine("ERR CATALOG NOT_FOUND");
      return true;
    }
    sendBleLine("BEGIN CATALOG");
    uint16_t sent = 0;
    while (file.available()) {
      feedWatchdog();
      char line[170]{};
      const size_t length = file.readBytesUntil('\n', line, sizeof(line) - 1);
      line[length] = '\0';
      if (line[0] != '\0') sendBleLine(line);
      ++sent;
    }
    file.close();
    sendBleLine("END CATALOG");
    return true;
  }
  return false;
}

bool AppController::handleFileCommand(const char* command) {
  if (command == nullptr) return false;

  if (strcasecmp(command, "FILE STATUS") == 0 ||
      strcasecmp(command, "UPLOAD STATUS") == 0 ||
      strcasecmp(command, "FS") == 0) {
    char line[140]{};
    snprintf(line, sizeof(line), "OK FILE SESSION=%s PATH=%s RX=%lu/%lu NEXT=%u",
             fileTransferOpen_ ? "OPEN" : "CLOSED",
             fileTransferPath_[0] == '\0' ? "-" : fileTransferPath_,
             static_cast<unsigned long>(fileTransferReceivedBytes_),
             static_cast<unsigned long>(fileTransferExpectedBytes_),
             static_cast<unsigned>(fileTransferNextSeq_));
    sendBleLine(line);
    return true;
  }

  const char* beginPayload = matchFileBeginPayload(command);

  if (beginPayload != nullptr) {
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR FILE SD_UNAVAILABLE");
      return true;
    }
    char payload[120]{};
    strlcpy(payload, beginPayload, sizeof(payload));
    char* separator = strrchr(payload, ' ');
    if (separator == nullptr) separator = strrchr(payload, ':');
    if (separator == nullptr) separator = strrchr(payload, '=');
    if (separator == nullptr) {
      sendBleLine("ERR FILE BEGIN USE: FB <path> <bytes>");
      return true;
    }
    *separator = '\0';
    const char* sizeText = skipSeparators(separator + 1);
    const uint32_t expectedBytes = strtoul(sizeText, nullptr, 10);
    char path[64]{};
    buildUserMediaPath(payload, path, sizeof(path));
    if (!isSafeUserMediaPath(path) || expectedBytes == 0) {
      sendBleLine("ERR FILE BEGIN PATH_OR_SIZE");
      return true;
    }
    if (!ensureUserMediaDirectories()) {
      sendBleLine("ERR FILE BEGIN MKDIR /usr");
      return true;
    }
    sdRemovePath(path);
    File file = sdOpenPath(path, FILE_WRITE);
    if (!file) {
      char line[120]{};
      snprintf(line, sizeof(line), "ERR FILE BEGIN OPEN %s", path);
      sendBleLine(line);
      return true;
    }
    file.close();
    fileTransferOpen_ = true;
    strlcpy(fileTransferPath_, path, sizeof(fileTransferPath_));
    fileTransferExpectedBytes_ = expectedBytes;
    fileTransferReceivedBytes_ = 0;
    fileTransferNextSeq_ = 0;
    char line[120]{};
    snprintf(line, sizeof(line), "OK FILE BEGIN %s SIZE=%lu", fileTransferPath_,
             static_cast<unsigned long>(fileTransferExpectedBytes_));
    sendBleLine(line);
    return true;
  }

  const char* chunkPayload = matchFileChunkPayload(command);
  if (chunkPayload != nullptr) {
    if (!fileTransferOpen_) {
      sendBleLine("ERR FILE CHUNK NO_SESSION");
      return true;
    }

    char payload[220]{};
    strlcpy(payload, chunkPayload, sizeof(payload));
    char* seqText = payload;
    while (*seqText == ' ' || *seqText == '\t') ++seqText;
    char* hexText = strpbrk(seqText, " :=\t");
    if (hexText == nullptr) {
      sendBleLine("ERR FILE CHUNK USE: FX <seq> <hex> <sum8>");
      return true;
    }
    *hexText++ = '\0';
    while (*hexText == ' ' || *hexText == ':' || *hexText == '=' ||
           *hexText == '\t') {
      ++hexText;
    }
    char* checksumText = strpbrk(hexText, " :=\t");
    if (checksumText == nullptr) {
      sendBleLine("ERR FILE CHUNK CHECKSUM");
      return true;
    }
    *checksumText++ = '\0';
    while (*checksumText == ' ' || *checksumText == ':' ||
           *checksumText == '=' || *checksumText == '\t') {
      ++checksumText;
    }

    const uint16_t seq = static_cast<uint16_t>(strtoul(seqText, nullptr, 10));
    if (seq != fileTransferNextSeq_) {
      char line[90]{};
      snprintf(line, sizeof(line), "ERR FILE CHUNK SEQ EXPECT=%u GOT=%u",
               static_cast<unsigned>(fileTransferNextSeq_),
               static_cast<unsigned>(seq));
      sendBleLine(line);
      return true;
    }

    const size_t hexLength = strlen(hexText);
    if (hexLength == 0 || (hexLength % 2) != 0) {
      sendBleLine("ERR FILE CHUNK HEX_LEN");
      return true;
    }

    const uint8_t expectedSum =
        static_cast<uint8_t>(strtoul(checksumText, nullptr, 16));
    uint8_t calculatedSum = 0;
    for (size_t index = 0; index < hexLength; index += 2) {
      uint8_t byte = 0;
      if (!decodeHexByte(hexText + index, byte)) {
        sendBleLine("ERR FILE CHUNK HEX");
        return true;
      }
      calculatedSum = static_cast<uint8_t>(calculatedSum + byte);
    }
    if (calculatedSum != expectedSum) {
      char line[90]{};
      snprintf(line, sizeof(line), "ERR FILE CHUNK SUM EXPECT=%02X GOT=%02X",
               expectedSum, calculatedSum);
      sendBleLine(line);
      return true;
    }

    File file = sdOpenPath(fileTransferPath_, FILE_APPEND);
    if (!file) {
      char line[120]{};
      snprintf(line, sizeof(line), "ERR FILE CHUNK OPEN %s", fileTransferPath_);
      sendBleLine(line);
      return true;
    }

    uint32_t written = 0;
    for (size_t index = 0; index < hexLength; index += 2) {
      uint8_t byte = 0;
      decodeHexByte(hexText + index, byte);
      file.write(byte);
      ++written;
    }
    file.close();

    fileTransferReceivedBytes_ += written;
    ++fileTransferNextSeq_;
    char line[110]{};
    snprintf(line, sizeof(line), "OK FILE CHUNK SEQ=%u RX=%lu/%lu",
             static_cast<unsigned>(seq),
             static_cast<unsigned long>(fileTransferReceivedBytes_),
             static_cast<unsigned long>(fileTransferExpectedBytes_));
    sendBleLine(line);
    return true;
  }

  const char* dataPayload = matchFileDataPayload(command);
  if (dataPayload != nullptr) {
    const char* hex = dataPayload;
    if (!fileTransferOpen_) {
      sendBleLine("ERR FILE DATA NO_SESSION");
      return true;
    }
    File file = sdOpenPath(fileTransferPath_, FILE_APPEND);
    if (!file) {
      char line[120]{};
      snprintf(line, sizeof(line), "ERR FILE DATA OPEN %s", fileTransferPath_);
      sendBleLine(line);
      return true;
    }
    uint32_t written = 0;
    while (hex[0] != '\0' && hex[1] != '\0') {
      if (hex[0] == ' ' || hex[0] == '-' || hex[0] == ':') {
        ++hex;
        continue;
      }
      uint8_t byte = 0;
      if (!decodeHexByte(hex, byte)) {
        file.close();
        sendBleLine("ERR FILE DATA HEX");
        return true;
      }
      file.write(byte);
      ++written;
      hex += 2;
    }
    file.close();
    fileTransferReceivedBytes_ += written;
    ++fileTransferNextSeq_;
    char line[90]{};
    snprintf(line, sizeof(line), "OK FILE DATA RX=%lu/%lu",
             static_cast<unsigned long>(fileTransferReceivedBytes_),
             static_cast<unsigned long>(fileTransferExpectedBytes_));
    sendBleLine(line);
    return true;
  }

  if (strcasecmp(command, "FILE END") == 0 ||
      strcasecmp(command, "UPLOAD END") == 0 ||
      strcasecmp(command, "FE") == 0) {
    if (!fileTransferOpen_) {
      sendBleLine("ERR FILE END NO_SESSION");
      return true;
    }
    const bool complete = fileTransferReceivedBytes_ == fileTransferExpectedBytes_;
    char finishedPath[64]{};
    strlcpy(finishedPath, fileTransferPath_, sizeof(finishedPath));
    fileTransferOpen_ = false;
    fileTransferPath_[0] = '\0';
    uint32_t actualSize = 0;
    if (complete) {
      File finishedFile = sdOpenPath(finishedPath, FILE_READ);
      if (finishedFile) {
        actualSize = static_cast<uint32_t>(finishedFile.size());
        finishedFile.close();
      }
      scanAudioTestFiles();
      scanFaceFiles();
      buildMediaIndex();
      buildCatalogJson();
      logEvent("file_upload", finishedPath);
    }
    if (complete) {
      char line[120]{};
      snprintf(line, sizeof(line), "OK FILE END %s SIZE=%lu",
               finishedPath, static_cast<unsigned long>(actualSize));
      sendBleLine(line);
    } else {
      sendBleLine("ERR FILE END SIZE_MISMATCH");
    }
    return true;
  }

  if (strcasecmp(command, "FILE CANCEL") == 0 ||
      strcasecmp(command, "UPLOAD CANCEL") == 0 ||
      strcasecmp(command, "FC") == 0) {
    if (fileTransferOpen_) sdRemovePath(fileTransferPath_);
    fileTransferOpen_ = false;
    fileTransferPath_[0] = '\0';
    fileTransferExpectedBytes_ = 0;
    fileTransferReceivedBytes_ = 0;
    fileTransferNextSeq_ = 0;
    sendBleLine("OK FILE CANCEL");
    return true;
  }

  if (strncasecmp(command, "DELETE AUDIO ", 13) == 0) {
    char path[64]{};
    const char* token = command + 13;
    if (token[0] == '/') {
      strlcpy(path, token, sizeof(path));
    } else {
      buildUserMediaPath(token, path, sizeof(path));
    }
    if (!isSafeUserMediaPath(path)) {
      sendBleLine("ERR DELETE PROTECTED_PATH");
      return true;
    }
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR DELETE SD_UNAVAILABLE");
      return true;
    }
    if (!sdExistsPath(path)) {
      sendBleLine("ERR DELETE NOT_FOUND");
      return true;
    }
    pendingDeleteCode_ = static_cast<uint16_t>(1000 + (millis() % 9000));
    strlcpy(pendingDeletePath_, path, sizeof(pendingDeletePath_));
    char line[130]{};
    snprintf(line, sizeof(line), "CONFIRM DELETE AUDIO %s CODE=%u",
             pendingDeletePath_, pendingDeleteCode_);
    sendBleLine(line);
    return true;
  }

  if (strncasecmp(command, "DELETE CONFIRM ", 15) == 0) {
    const uint16_t code = static_cast<uint16_t>(atoi(command + 15));
    if (pendingDeletePath_[0] == '\0' || code != pendingDeleteCode_) {
      sendBleLine("ERR DELETE CONFIRM CODE");
      return true;
    }
    const bool removed = sdRemovePath(pendingDeletePath_);
    char deletedPath[64]{};
    strlcpy(deletedPath, pendingDeletePath_, sizeof(deletedPath));
    pendingDeletePath_[0] = '\0';
    pendingDeleteCode_ = 0;
    if (removed) {
      scanAudioTestFiles();
      buildMediaIndex();
      buildCatalogJson();
      logEvent("file_delete", deletedPath);
    }
    sendBleLine(removed ? "OK DELETE" : "ERR DELETE REMOVE");
    return true;
  }

  return false;
}

bool AppController::handleAppCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "WIFI PUSH START") == 0) {
    audio_.stopPlayback();
    audioTestActive_ = false;
    if (!storage_.available() && !storage_.begin()) {
      sendBleLine("ERR WIFI SD_UNAVAILABLE");
      return true;
    }
    wifiTransfer_.configurePush();
    char line[180]{};
    snprintf(line, sizeof(line), "OK WIFI PUSH SSID=%s PASS=%s IP=192.168.4.1 TOKEN=%s",
             wifiTransfer_.ssid(), wifiTransfer_.password(), wifiTransfer_.token());
    sendBleLine(line);
    wifiPushScheduled_ = true;
    wifiPushAtMs_ = millis() + 1200;
    return true;
  }

  if (strcasecmp(command, "APP HELLO") == 0 ||
      strcasecmp(command, "HELLO") == 0) {
    char line[120]{};
    snprintf(line, sizeof(line), "OK APP HELLO FW=%s BLE=%s PROTO=%s",
             board::kFirmwareVersion, board::kBleName,
             board::kProtocolVersion);
    sendBleLine(line);
    return true;
  }

  if (strcasecmp(command, "APP CAPS") == 0 ||
      strcasecmp(command, "CAPS") == 0) {
    sendAppCaps();
    return true;
  }

  if (strcasecmp(command, "APP STATE") == 0 ||
      strcasecmp(command, "STATE") == 0) {
    sendAppState();
    return true;
  }

  if (strcasecmp(command, "APP SYNC") == 0 ||
      strcasecmp(command, "APP PROFILE") == 0 ||
      strcasecmp(command, "SYNC") == 0) {
    sendAppSync();
    return true;
  }

  return false;
}

void AppController::sendAppCaps() {
  sendBleLine("BEGIN APP CAPS");
  sendBleLine("CAP AUDIO_PLAY=1 AUDIO_UPLOAD=1 AUDIO_DELETE=1 AUDIO_LIST=1");
  sendBleLine("CAP FACE_LIST=1 FACE_SHOW=1 FACE_RANDOM=1 DISPLAY_MODES=1");
  sendBleLine("CAP LED=1 LED_PATTERNS=10 BRIGHTNESS=1 MOTOR=1 VIBRA=5");
  sendBleLine("CAP MIC=1 PANIC=1 SD_TREE=1 LOG=1 CONFIG=1 CATALOG=1");
  sendBleLine("CAP OTA_WIFI=1 WIFI_PUSH=1 TOUCH=0");
  sendBleLine("END APP CAPS");
}

void AppController::sendAppState() {
  const char* sdState = storage_.available() ? "OK" : "ERR";
  const char* audioState = audio_.playbackActive()
                               ? "PLAYING"
                               : (audioPaused_ ? "PAUSED" : "IDLE");
  const char* micState =
      microphoneActive_ ? (microphoneReady_ ? "ON" : "ERR") : "OFF";
  char line[150]{};

  snprintf(line, sizeof(line), "STATE DEVICE ID=%s NAME=%s FW=%s PROTO=%s",
           deviceId_, deviceName_, board::kFirmwareVersion,
           board::kProtocolVersion);
  sendBleLine(line);

  snprintf(line, sizeof(line), "STATE BLE NAME=%s CONNECTED=%s",
           board::kBleName, ble_.connected() ? "YES" : "NO");
  sendBleLine(line);

  snprintf(line, sizeof(line), "STATE SD=%s AUDIO=%s FILE=%s",
           sdState, audioState,
           audio_.playbackActive() ? audio_.playbackFileName() : "-");
  sendBleLine(line);

  snprintf(line, sizeof(line), "STATE VOL=%u BRILHO=%u LED=%u MODE=%s DIAG=%s",
           audio_.volumePercent(), leds_.brightnessPercent(), leds_.pattern(),
           preferredFacesMode_ ? "FACES" : "BLE",
           diagnosticMode_ ? "ON" : "OFF");
  sendBleLine(line);

  snprintf(line, sizeof(line), "STATE MIC=%s PANIC_EN=%s PANIC_STATE=%s LEVEL=%u",
           micState, panic_.enabled() ? "ON" : "OFF",
           panicStateName(panic_.state()), panic_.triggerPercent());
  sendBleLine(line);

  sendBleLine("STATE OTA TRANSPORT=WIFI");
}

void AppController::sendAppSync() {
  if (storage_.available() || storage_.begin()) {
    scanAudioTestFiles();
    scanFaceFiles();
  }

  char line[120]{};
  snprintf(line, sizeof(line), "BEGIN APP SYNC FW=%s PROTO=%s",
           board::kFirmwareVersion, board::kProtocolVersion);
  sendBleLine(line);
  if (storage_.available() && SD.exists("/update.last")) {
    File updateStatus = SD.open("/update.last", FILE_READ);
    if (updateStatus) {
      char result[80]{};
      const size_t length = updateStatus.readBytesUntil('\n', result, sizeof(result) - 1);
      result[length] = '\0';
      updateStatus.close();
      snprintf(line, sizeof(line), "UPDATE LAST %s", result);
      sendBleLine(line);
    }
  }

  sendAppCaps();
  sendAppState();

  snprintf(line, sizeof(line), "APP MEDIA AUDIO_COUNT=%u FACE_COUNT=%u",
           static_cast<unsigned>(audioTestFileCount_),
           static_cast<unsigned>(faceFileCount_));
  sendBleLine(line);

  for (size_t index = 0; index < audioTestFileCount_ && index < 8; ++index) {
    feedWatchdog();
    snprintf(line, sizeof(line), "APP AUDIO %u %s",
             static_cast<unsigned>(index + 1), audioTestFiles_[index]);
    sendBleLine(line);
  }
  if (audioTestFileCount_ > 8) sendBleLine("APP AUDIO TRUNCATED=1");

  for (size_t index = 0; index < faceFileCount_ && index < 8; ++index) {
    feedWatchdog();
    snprintf(line, sizeof(line), "APP FACE %u %s",
             static_cast<unsigned>(index + 1), faceFiles_[index]);
    sendBleLine(line);
  }
  if (faceFileCount_ > 8) sendBleLine("APP FACE TRUNCATED=1");

  sendBleLine("END APP SYNC");
}

bool AppController::handleAdvancedPlayCommand(const char* command) {
  if (command == nullptr) return false;

  if (strcasecmp(command, "PLAY LOOP ON") == 0) {
    audioLoop_ = true;
    sendBleLine("OK PLAY LOOP ON");
    return true;
  }
  if (strcasecmp(command, "PLAY LOOP OFF") == 0) {
    audioLoop_ = false;
    sendBleLine("OK PLAY LOOP OFF");
    return true;
  }
  if (strcasecmp(command, "PLAY RANDOM") == 0) {
    if (audioTestFileCount_ == 0) scanAudioTestFiles();
    if (audioTestFileCount_ == 0) {
      sendBleLine("ERR PLAY RANDOM NO_AUDIO");
      return true;
    }
    currentAudioIndex_ = random(audioTestFileCount_);
    const bool ok = playAudioFromBleToken(audioTestFiles_[currentAudioIndex_]);
    sendBleLine(ok ? "OK PLAY RANDOM" : "ERR PLAY RANDOM");
    return true;
  }
  if (strcasecmp(command, "PLAY NEXT") == 0) {
    if (audioTestFileCount_ == 0) scanAudioTestFiles();
    if (audioTestFileCount_ == 0) {
      sendBleLine("ERR PLAY NEXT NO_AUDIO");
      return true;
    }
    currentAudioIndex_ = (currentAudioIndex_ + 1) % audioTestFileCount_;
    const bool ok = playAudioFromBleToken(audioTestFiles_[currentAudioIndex_]);
    sendBleLine(ok ? "OK PLAY NEXT" : "ERR PLAY NEXT");
    return true;
  }
  if (strcasecmp(command, "PLAY PREV") == 0 ||
      strcasecmp(command, "PLAY PREVIOUS") == 0) {
    if (audioTestFileCount_ == 0) scanAudioTestFiles();
    if (audioTestFileCount_ == 0) {
      sendBleLine("ERR PLAY PREV NO_AUDIO");
      return true;
    }
    currentAudioIndex_ =
        currentAudioIndex_ == 0 ? audioTestFileCount_ - 1 : currentAudioIndex_ - 1;
    const bool ok = playAudioFromBleToken(audioTestFiles_[currentAudioIndex_]);
    sendBleLine(ok ? "OK PLAY PREV" : "ERR PLAY PREV");
    return true;
  }
  return false;
}

#if 0  // Transporte OTA por BLE legado; a v070 usa somente OTA por Wi-Fi.
bool AppController::handleOtaCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "OTA STATUS") == 0 ||
      strcasecmp(command, "OTA?") == 0) {
    char line[150]{};
    snprintf(line, sizeof(line),
             "OK OTA SESSION=%s RX=%lu/%lu READY_REBOOT=%s ERR=%s",
             update_.active() ? "OPEN" : "CLOSED",
             static_cast<unsigned long>(update_.receivedSize()),
             static_cast<unsigned long>(update_.expectedSize()),
             update_.readyToReboot() ? "YES" : "NO",
             update_.lastError()[0] == '\0' ? "-" : update_.lastError());
    sendBleLine(line);
    return true;
  }

  if (strncasecmp(command, "OTA BEGIN ", 10) == 0) {
    char payload[96]{};
    strlcpy(payload, command + 10, sizeof(payload));
    char* sizeText = payload;
    while (*sizeText == ' ' || *sizeText == '\t') ++sizeText;
    char* md5Text = strpbrk(sizeText, " \t");
    if (md5Text != nullptr) {
      *md5Text++ = '\0';
      while (*md5Text == ' ' || *md5Text == '\t') ++md5Text;
    }
    const uint32_t size = strtoul(sizeText, nullptr, 10);
    if (size == 0) {
      sendBleLine("ERR OTA SIZE");
      return true;
    }
    if (!update_.start(size, md5Text)) {
      char line[100]{};
      snprintf(line, sizeof(line), "ERR OTA BEGIN %s", update_.lastError());
      sendBleLine(line);
      return true;
    }
    bleOtaSessionOpen_ = true;
    bleOtaExpectedBytes_ = update_.expectedSize();
    bleOtaReceivedBytes_ = 0;
    sendBleLine("OK OTA BEGIN FLASH_WRITE");
    logEvent("ota_begin", "ble");
    return true;
  }

  if (strncasecmp(command, "OTA DATA ", 9) == 0) {
    if (!update_.active()) {
      sendBleLine("ERR OTA NO_SESSION");
      return true;
    }

    const char* hex = command + 9;
    while (*hex == ' ' || *hex == ':' || *hex == '=' || *hex == '\t') ++hex;
    const size_t hexLength = strlen(hex);
    if (hexLength == 0 || (hexLength % 2) != 0 || hexLength > 192) {
      sendBleLine("ERR OTA DATA HEX_LEN");
      return true;
    }

    uint8_t buffer[96]{};
    const size_t byteCount = hexLength / 2;
    for (size_t index = 0; index < byteCount; ++index) {
      if (!decodeHexByte(hex + index * 2, buffer[index])) {
        sendBleLine("ERR OTA DATA HEX");
        return true;
      }
    }

    const size_t written = update_.write(buffer, byteCount);
    bleOtaReceivedBytes_ = update_.receivedSize();
    if (written != byteCount) {
      char line[100]{};
      snprintf(line, sizeof(line), "ERR OTA DATA %s", update_.lastError());
      sendBleLine(line);
      return true;
    }

    char line[100]{};
    snprintf(line, sizeof(line), "OK OTA DATA RX=%lu/%lu",
             static_cast<unsigned long>(update_.receivedSize()),
             static_cast<unsigned long>(update_.expectedSize()));
    sendBleLine(line);
    return true;
  }

  if (strcasecmp(command, "OTA END") == 0) {
    if (!update_.active()) {
      sendBleLine("ERR OTA NO_SESSION");
      return true;
    }
    const bool ok = update_.finish();
    bleOtaSessionOpen_ = false;
    bleOtaExpectedBytes_ = update_.expectedSize();
    bleOtaReceivedBytes_ = update_.receivedSize();
    if (ok) {
      sendBleLine("OK OTA END VALIDATED SEND OTA REBOOT");
    } else {
      char line[100]{};
      snprintf(line, sizeof(line), "ERR OTA END %s", update_.lastError());
      sendBleLine(line);
    }
    logEvent("ota_end", "ble");
    return true;
  }

  if (strcasecmp(command, "OTA CANCEL") == 0) {
    update_.cancel();
    bleOtaSessionOpen_ = false;
    bleOtaExpectedBytes_ = 0;
    bleOtaReceivedBytes_ = 0;
    sendBleLine("OK OTA CANCEL");
    return true;
  }

  if (strcasecmp(command, "OTA REBOOT") == 0) {
    if (!update_.readyToReboot()) {
      sendBleLine("ERR OTA REBOOT NOT_READY");
      return true;
    }
    sendBleLine("OK OTA REBOOT");
    delay(300);
    ESP.restart();
    return true;
  }

  return false;
}
#endif

bool AppController::handleConfigCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "CONFIG") == 0 ||
      strcasecmp(command, "CONFIG GET") == 0 ||
      strcasecmp(command, "CFG") == 0 ||
      strcasecmp(command, "CFG GET") == 0) {
    sendConfig();
    return true;
  }

  if (strcasecmp(command, "CONFIG SAVE") == 0 ||
      strcasecmp(command, "CFG SAVE") == 0) {
    sendBleLine(saveConfigToSd() ? "OK CONFIG SAVE" : "ERR CONFIG SAVE");
    return true;
  }

  if (strcasecmp(command, "CONFIG LOAD") == 0 ||
      strcasecmp(command, "CFG LOAD") == 0) {
    loadConfigFromSd(true);
    return true;
  }

  const char* payload = nullptr;
  if (strncasecmp(command, "CONFIG SET ", 11) == 0) {
    payload = command + 11;
  } else if (strncasecmp(command, "CFG SET ", 8) == 0) {
    payload = command + 8;
  }
  if (payload == nullptr) return false;

  while (*payload == ' ' || *payload == '\t') ++payload;
  char key[24]{};
  char value[64]{};
  size_t keyLength = 0;
  while (payload[keyLength] != '\0' && payload[keyLength] != ' ' &&
         payload[keyLength] != '=' && payload[keyLength] != ':' &&
         keyLength < sizeof(key) - 1) {
    key[keyLength] = payload[keyLength];
    ++keyLength;
  }
  key[keyLength] = '\0';

  const char* valueStart = payload + keyLength;
  while (*valueStart == ' ' || *valueStart == '=' || *valueStart == ':' ||
         *valueStart == '\t') {
    ++valueStart;
  }
  strlcpy(value, valueStart, sizeof(value));
  char* valueEnd = value + strlen(value);
  while (valueEnd > value &&
         (valueEnd[-1] == ' ' || valueEnd[-1] == '\r' ||
          valueEnd[-1] == '\n' || valueEnd[-1] == '\t')) {
    *--valueEnd = '\0';
  }

  if (key[0] == '\0' || value[0] == '\0') {
    sendBleLine("ERR CONFIG SET USE KEY VALUE");
    return true;
  }
  return applyConfigKeyValue(key, value, true);
}

void AppController::sendConfig() {
  char line[190]{};
  snprintf(line, sizeof(line),
           "OK CONFIG VOL=%u BRILHO=%u LED=%u MODE=%s DIAG=%s PANIC=%s "
           "PANIC_LEVEL=%u PANIC_IDLE=%lu",
           audio_.volumePercent(), leds_.brightnessPercent(),
           leds_.pattern(), preferredFacesMode_ ? "FACES" : "BLE",
           diagnosticMode_ ? "ON" : "OFF", panic_.enabled() ? "ON" : "OFF",
           panic_.triggerPercent(),
           static_cast<unsigned long>(panic_.idleDelayMs() / 1000UL));
  sendBleLine(line);
}

bool AppController::saveConfigToSd() {
  if (!storage_.available() && !storage_.begin()) return false;
  SD.mkdir("/sys");
  SD.mkdir("/sys/c");

  File file = SD.open("/sys/c/config.txt", FILE_WRITE);
  if (!file) return false;
  file.printf("version=%s\n", board::kFirmwareVersion);
  file.printf("volume=%u\n", audio_.volumePercent());
  file.printf("brilho=%u\n", leds_.brightnessPercent());
  file.printf("led=%u\n", leds_.pattern());
  file.printf("mode=%s\n", preferredFacesMode_ ? "faces" : "ble");
  file.printf("face_random=%s\n", faceRandomLoop_ ? "on" : "off");
  file.printf("diag=%s\n", diagnosticMode_ ? "on" : "off");
  file.printf("panic=%s\n", panic_.enabled() ? "on" : "off");
  file.printf("panic_level=%u\n", panic_.triggerPercent());
  file.printf("panic_idle=%lu\n",
              static_cast<unsigned long>(panic_.idleDelayMs() / 1000UL));
  file.printf("device_id=%s\n", deviceId_);
  file.printf("device_name=%s\n", deviceName_);
  file.printf("audio_loop=%s\n", audioLoop_ ? "on" : "off");
  file.close();
  logEvent("config_save", "/sys/c/config.txt");
  Serial.println("[CONFIG] Gravado em /sys/c/config.txt.");
  return true;
}

bool AppController::loadConfigFromSd(bool report) {
  if (!storage_.available() && !storage_.begin()) {
    if (report) sendBleLine("ERR CONFIG LOAD SD_UNAVAILABLE");
    return false;
  }

  File file = SD.open("/sys/c/config.txt", FILE_READ);
  if (!file) {
    if (report) sendBleLine("ERR CONFIG LOAD NOT_FOUND");
    return false;
  }

  bool appliedAny = false;
  while (file.available()) {
    char line[96]{};
    const size_t length = file.readBytesUntil('\n', line, sizeof(line) - 1);
    line[length] = '\0';
    char* cursor = line;
    while (*cursor == ' ' || *cursor == '\t') ++cursor;
    if (*cursor == '\0' || *cursor == '#') continue;
    char* separator = strchr(cursor, '=');
    if (separator == nullptr) continue;
    *separator = '\0';
    char* key = cursor;
    char* value = separator + 1;
    char* keyEnd = key + strlen(key);
    while (keyEnd > key && (keyEnd[-1] == ' ' || keyEnd[-1] == '\t')) {
      *--keyEnd = '\0';
    }
    while (*value == ' ' || *value == '\t') ++value;
    char* valueEnd = value + strlen(value);
    while (valueEnd > value &&
           (valueEnd[-1] == ' ' || valueEnd[-1] == '\r' ||
            valueEnd[-1] == '\n' || valueEnd[-1] == '\t')) {
      *--valueEnd = '\0';
    }
    if (applyConfigKeyValue(key, value, false)) appliedAny = true;
  }
  file.close();
  if (report) sendBleLine(appliedAny ? "OK CONFIG LOAD" : "ERR CONFIG LOAD EMPTY");
  if (appliedAny) Serial.println("[CONFIG] Configuracao carregada do SD.");
  return appliedAny;
}

bool AppController::applyConfigKeyValue(const char* key, const char* value,
                                        bool report) {
  if (key == nullptr || value == nullptr) return false;

  if (strcasecmp(key, "volume") == 0 || strcasecmp(key, "vol") == 0) {
    const int percent = atoi(value);
    if (percent < 0 || percent > 100) {
      if (report) sendBleLine("ERR CONFIG VOL RANGE 0-100");
      return true;
    }
    audio_.setVolumePercent(static_cast<uint8_t>(percent));
    if (report) sendBleLine("OK CONFIG SET VOL");
    return true;
  }

  if (strcasecmp(key, "brilho") == 0 ||
      strcasecmp(key, "brightness") == 0) {
    const int percent = atoi(value);
    if (percent < 0 || percent > 100) {
      if (report) sendBleLine("ERR CONFIG BRILHO RANGE 0-100");
      return true;
    }
    leds_.setBrightnessPercent(static_cast<uint8_t>(percent));
    if (report) sendBleLine("OK CONFIG SET BRILHO");
    return true;
  }

  if (strcasecmp(key, "led") == 0) {
    const int pattern = atoi(value);
    if (pattern < 0 || pattern > 10) {
      if (report) sendBleLine("ERR CONFIG LED RANGE 0-10");
      return true;
    }
    leds_.setPattern(static_cast<uint8_t>(pattern));
    if (report) sendBleLine("OK CONFIG SET LED");
    return true;
  }

  if (strcasecmp(key, "mode") == 0 || strcasecmp(key, "modo") == 0) {
    if (strcasecmp(value, "faces") == 0 || strcasecmp(value, "face") == 0) {
      preferredFacesMode_ = true;
      if (report) sendBleLine("OK CONFIG SET MODE FACES");
      return true;
    }
    if (strcasecmp(value, "ble") == 0 || strcasecmp(value, "panel") == 0 ||
        strcasecmp(value, "painel") == 0) {
      preferredFacesMode_ = false;
      blePanelActive_ = true;
      faceCyclingActive_ = false;
      if (report) sendBleLine("OK CONFIG SET MODE BLE");
      return true;
    }
    if (report) sendBleLine("ERR CONFIG MODE USE FACES|BLE");
    return true;
  }

  if (strcasecmp(key, "face_random") == 0 ||
      strcasecmp(key, "faces_random") == 0) {
    faceRandomLoop_ = strcasecmp(value, "on") == 0 ||
                      strcasecmp(value, "1") == 0 ||
                      strcasecmp(value, "true") == 0;
    if (report) {
      sendBleLine(faceRandomLoop_ ? "OK CONFIG SET FACE_RANDOM ON"
                                  : "OK CONFIG SET FACE_RANDOM OFF");
    }
    return true;
  }

  if (strcasecmp(key, "diag") == 0 || strcasecmp(key, "diagnostic") == 0) {
    diagnosticMode_ = strcasecmp(value, "on") == 0 ||
                      strcasecmp(value, "1") == 0 ||
                      strcasecmp(value, "true") == 0;
    if (report) sendBleLine(diagnosticMode_ ? "OK CONFIG SET DIAG ON"
                                             : "OK CONFIG SET DIAG OFF");
    return true;
  }

  if (strcasecmp(key, "panic") == 0 || strcasecmp(key, "panico") == 0) {
    const bool enabled = strcasecmp(value, "on") == 0 ||
                         strcasecmp(value, "1") == 0 ||
                         strcasecmp(value, "true") == 0;
    panic_.setEnabled(enabled);
    if (report) sendBleLine(enabled ? "OK CONFIG SET PANIC ON"
                                    : "OK CONFIG SET PANIC OFF");
    return true;
  }

  if (strcasecmp(key, "panic_level") == 0 ||
      strcasecmp(key, "panic_level_percent") == 0) {
    const int percent = atoi(value);
    if (percent < 0 || percent > 100) {
      if (report) sendBleLine("ERR CONFIG PANIC_LEVEL RANGE 0-100");
      return true;
    }
    panic_.setTriggerPercent(static_cast<uint8_t>(percent));
    if (report) sendBleLine("OK CONFIG SET PANIC_LEVEL");
    return true;
  }

  if (strcasecmp(key, "panic_idle") == 0 ||
      strcasecmp(key, "panic_idle_seconds") == 0) {
    const int seconds = atoi(value);
    if (seconds < 10 || seconds > 3600) {
      if (report) sendBleLine("ERR CONFIG PANIC_IDLE RANGE 10-3600");
      return true;
    }
    panic_.setIdleDelayMs(static_cast<uint32_t>(seconds) * 1000UL);
    if (report) sendBleLine("OK CONFIG SET PANIC_IDLE");
    return true;
  }

  if (strcasecmp(key, "device_id") == 0) {
    strlcpy(deviceId_, value, sizeof(deviceId_));
    if (report) sendBleLine("OK CONFIG SET DEVICE_ID");
    return true;
  }

  if (strcasecmp(key, "device_name") == 0) {
    strlcpy(deviceName_, value, sizeof(deviceName_));
    if (report) sendBleLine("OK CONFIG SET DEVICE_NAME");
    return true;
  }

  if (strcasecmp(key, "audio_loop") == 0 || strcasecmp(key, "loop") == 0) {
    audioLoop_ = strcasecmp(value, "on") == 0 ||
                 strcasecmp(value, "1") == 0 ||
                 strcasecmp(value, "true") == 0;
    if (report) sendBleLine(audioLoop_ ? "OK CONFIG SET LOOP ON"
                                       : "OK CONFIG SET LOOP OFF");
    return true;
  }

  if (strcasecmp(key, "version") == 0) return false;

  if (report) sendBleLine("ERR CONFIG KEY");
  return false;
}

bool AppController::handleFaceCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "FACE?") == 0) {
    char line[150]{};
    snprintf(line, sizeof(line),
             "OK FACE MODE=%s RANDOM=%s INDEX=%u COUNT=%u CURRENT=%s",
             preferredFacesMode_ ? "ON" : "OFF",
             faceRandomLoop_ ? "ON" : "OFF",
             static_cast<unsigned>(faceFileCount_ == 0 ? 0 : currentFaceIndex_ + 1),
             static_cast<unsigned>(faceFileCount_),
             faceFileCount_ == 0 ? "-" : faceFiles_[currentFaceIndex_]);
    sendBleLine(line);
    return true;
  }

  if (strcasecmp(command, "FACE RANDOM ON") == 0) {
    faceRandomLoop_ = true;
    sendBleLine("OK FACE RANDOM ON");
    return true;
  }
  if (strcasecmp(command, "FACE RANDOM OFF") == 0) {
    faceRandomLoop_ = false;
    sendBleLine("OK FACE RANDOM OFF");
    return true;
  }

  const char* token = nullptr;
  if (strncasecmp(command, "FACE ", 5) == 0 ||
      strncasecmp(command, "FACE:", 5) == 0 ||
      strncasecmp(command, "FACE=", 5) == 0) {
    token = command + 5;
  }
  if (token == nullptr || token[0] == '\0') return false;

  if (diagnosticMode_) {
    sendBleLine("ERR FACE DISABLED_DIAG");
    return true;
  }

  if (showFaceByToken(token)) {
    char line[120]{};
    snprintf(line, sizeof(line), "OK FACE %s", faceFiles_[currentFaceIndex_]);
    sendBleLine(line);
  } else {
    sendBleLine("ERR FACE NOT_FOUND");
  }
  return true;
}

bool AppController::showFaceByToken(const char* token) {
  if (token == nullptr || token[0] == '\0') return false;
  if (!storage_.available() && !storage_.begin()) return false;
  if (faceFileCount_ == 0) scanFaceFiles();
  if (faceFileCount_ == 0) return false;

  char cleanedToken[kMaxFacePathLength]{};
  strlcpy(cleanedToken, token, sizeof(cleanedToken));
  char* start = cleanedToken;
  while (*start == ' ' || *start == '\t' || *start == ':' || *start == '=') {
    ++start;
  }
  char* end = start + strlen(start);
  while (end > start &&
         (end[-1] == ' ' || end[-1] == '\r' || end[-1] == '\n' ||
          end[-1] == '\t')) {
    *--end = '\0';
  }
  if (start[0] == '\0') return false;

  if (strcasecmp(start, "RANDOM") == 0 || strcasecmp(start, "ALEATORIA") == 0 ||
      strcasecmp(start, "ALEATORIO") == 0) {
    faceRandomLoop_ = true;
    currentFaceIndex_ = random(faceFileCount_);
  } else if (isDigit(start[0])) {
    faceRandomLoop_ = false;
    const int faceNumber = atoi(start);
    if (faceNumber < 1 || faceNumber > static_cast<int>(faceFileCount_)) {
      return false;
    }
    currentFaceIndex_ = static_cast<size_t>(faceNumber - 1);
  } else {
    faceRandomLoop_ = false;
    bool found = false;
    for (size_t index = 0; index < faceFileCount_; ++index) {
      const char* path = faceFiles_[index];
      const char* baseName = strrchr(path, '/');
      baseName = baseName == nullptr ? path : baseName + 1;
      if (strcasecmp(path, start) == 0 || strcasecmp(baseName, start) == 0) {
        currentFaceIndex_ = index;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }

  faceCyclingActive_ = true;
  blePanelActive_ = false;
  lastFaceChangeMs_ = millis();
  display_.showFaceFile(faceFiles_[currentFaceIndex_]);
  return true;
}

bool AppController::handleModeCommand(const char* command) {
  if (command == nullptr) return false;
  if (strcasecmp(command, "MODE?") == 0 || strcasecmp(command, "MODO?") == 0) {
    sendBleLine(blePanelActive_ ? "OK MODE BLE" : "OK MODE FACES");
    return true;
  }

  const char* mode = nullptr;
  if (strncasecmp(command, "MODE ", 5) == 0 ||
      strncasecmp(command, "MODE:", 5) == 0 ||
      strncasecmp(command, "MODO ", 5) == 0 ||
      strncasecmp(command, "MODO:", 5) == 0) {
    mode = command + 5;
  }
  if (mode == nullptr) return false;

  while (*mode == ' ' || *mode == ':' || *mode == '=') ++mode;
  if (strcasecmp(mode, "FACES") == 0 || strcasecmp(mode, "FACE") == 0) {
    if (diagnosticMode_) {
      sendBleLine("ERR MODE FACES DISABLED_DIAG");
      return true;
    }

    if (faceFileCount_ == 0) scanFaceFiles();
    if (faceFileCount_ == 0) {
      sendBleLine("ERR MODE FACES NO_FILES");
      return true;
    }
    preferredFacesMode_ = true;
    blePanelActive_ = false;
    faceCyclingActive_ = true;
    lastFaceChangeMs_ = 0;
    updateFaces(millis());
    sendBleLine("OK MODE FACES");
    return true;
  }

  if (strcasecmp(mode, "BLE") == 0 || strcasecmp(mode, "PANEL") == 0 ||
      strcasecmp(mode, "PAINEL") == 0) {
    preferredFacesMode_ = false;
    blePanelActive_ = true;
    faceCyclingActive_ = false;
    updateBlePanel(true);
    sendBleLine("OK MODE BLE");
    return true;
  }

  sendBleLine("ERR MODE USE FACES|BLE");
  return true;
}

bool AppController::handleVolumeCommand(const char* command) {
  if (strcasecmp(command, "VOL?") == 0 || strcasecmp(command, "VOLUME?") == 0) {
    char line[32]{};
    snprintf(line, sizeof(line), "OK VOL %u", audio_.volumePercent());
    sendBleLine(line);
    return true;
  }

  int value = -1;
  if (!parseNumberArgument(command, "VOL", value) &&
      !parseNumberArgument(command, "VOLUME", value)) {
    return false;
  }
  if (value < 0 || value > 100) {
    sendBleLine("ERR VOL RANGE 0-100");
    return true;
  }
  audio_.setVolumePercent(static_cast<uint8_t>(value));
  char line[32]{};
  snprintf(line, sizeof(line), "OK VOL %u", audio_.volumePercent());
  sendBleLine(line);
  return true;
}

bool AppController::handleSeekCommand(const char* command) {
  int pct = -1;
  if (!parseNumberArgument(command, "SEEK", pct) &&
      !parseNumberArgument(command, "POS", pct)) {
    return false;
  }
  if (pct < 0 || pct > 100) {
    sendBleLine("ERR SEEK RANGE 0-100");
    return true;
  }
  if (audio_.playbackActive() && audio_.playbackSize() > 0 && currentAudioPath_[0] != '\0') {
    const uint32_t targetByte = ((static_cast<uint64_t>(audio_.playbackSize()) * pct) / 100) & ~uint32_t{1};
    audio_.playWavFileFrom(currentAudioPath_, targetByte);
  }
  char line[32]{};
  snprintf(line, sizeof(line), "OK SEEK %d", pct);
  sendBleLine(line);
  return true;
}

bool AppController::handleBrightnessCommand(const char* command) {
  if (strcasecmp(command, "BRILHO?") == 0 ||
      strcasecmp(command, "BRIGHTNESS?") == 0) {
    char line[40]{};
    snprintf(line, sizeof(line), "OK BRILHO %u", leds_.brightnessPercent());
    sendBleLine(line);
    return true;
  }

  int value = -1;
  if (!parseNumberArgument(command, "BRILHO", value) &&
      !parseNumberArgument(command, "BRIGHTNESS", value)) {
    return false;
  }
  if (value < 0 || value > 100) {
    sendBleLine("ERR BRILHO RANGE 0-100");
    return true;
  }
  leds_.setBrightnessPercent(static_cast<uint8_t>(value));
  char line[40]{};
  snprintf(line, sizeof(line), "OK BRILHO %u", leds_.brightnessPercent());
  sendBleLine(line);
  return true;
}

bool AppController::handleLedPatternCommand(const char* command) {
  if (strcasecmp(command, "LED?") == 0) {
    char line[32]{};
    snprintf(line, sizeof(line), "OK LED %u", leds_.pattern());
    sendBleLine(line);
    return true;
  }

  int value = -1;
  if (!parseNumberArgument(command, "LED", value)) return false;
  if (value < 1 || value > 10) {
    sendBleLine("ERR LED RANGE 1-10");
    return true;
  }
  leds_.setPattern(static_cast<uint8_t>(value));
  char line[32]{};
  snprintf(line, sizeof(line), "OK LED %u", leds_.pattern());
  sendBleLine(line);
  return true;
}

bool AppController::handleVibrationCommand(const char* command) {
  if (strcasecmp(command, "VIBRA?") == 0 ||
      strcasecmp(command, "VIBRA LIST") == 0) {
    sendBleLine("OK VIBRA 1=leve 2=curta 3=media 4=longa 5=forte");
    return true;
  }

  int value = -1;
  if (!parseNumberArgument(command, "VIBRA", value) &&
      !parseNumberArgument(command, "VIB", value)) {
    return false;
  }
  if (value < 1 || value > 5) {
    sendBleLine("ERR VIBRA RANGE 1-5");
    return true;
  }

  struct Pattern {
    uint8_t duty;
    uint32_t durationMs;
  };
  constexpr Pattern patterns[] = {
      {90, 350}, {140, 600}, {190, 900}, {170, 1600}, {255, 2400},
  };
  const Pattern& pattern = patterns[value - 1];
  vibration_.clearSafetyLockout();
  vibration_.stop();
  const bool started = vibration_.start(pattern.duty, pattern.durationMs);
  if (started) {
    manualVibrationPattern_ = static_cast<uint8_t>(value);
    manualVibrationActive_ = true;
    manualVibrationStartedAtMs_ = millis();
  }

  char line[64]{};
  snprintf(line, sizeof(line), "%s VIBRA %d", started ? "OK" : "ERR", value);
  sendBleLine(line);
  return true;
}

void AppController::noteUserActivity() {
  lastUserActivityMs_ = millis();
  deactivateMicrophone();
}

void AppController::updateIdleMicrophone(uint32_t nowMs) {
  if (microphoneActive_) return;
  if (!panic_.enabled()) return;
  if (nowMs - lastUserActivityMs_ < panic_.idleDelayMs()) return;
  activateMicrophone(nowMs);
}

void AppController::activateMicrophone(uint32_t nowMs) {
  Serial.println("[MIC] CYD ociosa por 5 minutos; ativando microfone e panico.");
  microphoneReady_ = microphone_.begin();
  microphoneActive_ = microphoneReady_;
  latestMicrophoneLevelPercent_ = 0;
  lastMicrophoneUpdateMs_ = nowMs;
  lastMicrophoneLogMs_ = nowMs;
  if (!microphoneReady_) {
    Serial.println("[MIC] Falha ao ativar microfone; panico permanece inativo.");
    lastUserActivityMs_ = nowMs;
  }
}

void AppController::deactivateMicrophone() {
  if (!microphoneActive_ && latestMicrophoneLevelPercent_ == 0) return;
  microphoneActive_ = false;
  latestMicrophoneLevelPercent_ = 0;
  panic_.update(0, millis(), vibration_, audio_);
  Serial.println("[MIC] Microfone/panico desligados por comando BLE.");
}

void AppController::updateFaces(uint32_t nowMs) {
  if (diagnosticMode_) return;
  if (faceFileCount_ == 0) return;
  if (!preferredFacesMode_ && blePanelActive_) return;

  if (blePanelActive_) {
    if (nowMs - lastUserActivityMs_ < 5000) return;
    blePanelActive_ = false;
    faceCyclingActive_ = true;
    lastFaceChangeMs_ = 0;
  }

  if (!faceCyclingActive_) {
    faceCyclingActive_ = true;
    lastFaceChangeMs_ = 0;
  }

  if (!faceRandomLoop_ && lastFaceChangeMs_ != 0) return;

  if (lastFaceChangeMs_ != 0 && nowMs - lastFaceChangeMs_ < kFaceDisplayMs) {
    return;
  }

  lastFaceChangeMs_ = nowMs;
  size_t nextFaceIndex = currentFaceIndex_;
  if (faceFileCount_ > 1) {
    while (nextFaceIndex == currentFaceIndex_) {
      nextFaceIndex = random(faceFileCount_);
    }
  }
  currentFaceIndex_ = nextFaceIndex;
  display_.showFaceFile(faceFiles_[currentFaceIndex_]);
}

bool AppController::playAudioFromBleToken(const char* token) {
  lastPlayError_[0] = '\0';
  if (!board::kAudioEnabled || !audio_.ready()) {
    Serial.println("[BLE] Audio indisponivel para reproducao.");
    strlcpy(lastPlayError_, "AUDIO_NOT_READY", sizeof(lastPlayError_));
    return false;
  }
  if (!storage_.available()) {
    Serial.println("[BLE] SD indisponivel; tentando remontar.");
    if (!storage_.begin()) {
      Serial.println("[BLE] SD indisponivel para audio.");
      strlcpy(lastPlayError_, "SD_UNAVAILABLE", sizeof(lastPlayError_));
      return false;
    }
  }

  char cleanedToken[kMaxAudioTestPathLength]{};
  strlcpy(cleanedToken, token, sizeof(cleanedToken));
  char* tokenStart = cleanedToken;
  while (*tokenStart == ' ' || *tokenStart == '\r' || *tokenStart == '\n' ||
         *tokenStart == '\t') {
    ++tokenStart;
  }
  char* tokenEnd = tokenStart + strlen(tokenStart);
  while (tokenEnd > tokenStart &&
         (tokenEnd[-1] == ' ' || tokenEnd[-1] == '\r' ||
          tokenEnd[-1] == '\n' || tokenEnd[-1] == '\t')) {
    *--tokenEnd = '\0';
  }
  if (tokenStart[0] == '\0') return false;

  char path[kMaxAudioTestPathLength]{};
  if (tokenStart[0] == '/') {
    strlcpy(path, tokenStart, sizeof(path));
  } else {
    char fileName[32]{};
    strlcpy(fileName, tokenStart, sizeof(fileName));
    if (strstr(fileName, ".wav") == nullptr) {
      strlcat(fileName, ".wav", sizeof(fileName));
    }
    if (!resolveAudioTestPath(fileName, path, sizeof(path))) {
      snprintf(path, sizeof(path), "/sys/a/%s", fileName);
    }
  }

  char playablePath[kMaxAudioTestPathLength]{};
  if (!sdResolveOpenablePath(path, playablePath, sizeof(playablePath))) {
    Serial.printf("[BLE] Audio nao encontrado: %s\n", path);
    char error[80]{};
    snprintf(error, sizeof(error), "NOT_FOUND %s", path);
    strlcpy(lastPlayError_, error, sizeof(lastPlayError_));
    return false;
  }

  audio_.stopPlayback();
  audioTestActive_ = false;
  audioTestPlaybackPending_ = false;
  strlcpy(currentAudioPath_, playablePath, sizeof(currentAudioPath_));
  if (!audio_.playWavFile(playablePath)) {
    Serial.printf("[BLE] Falha ao iniciar audio: %s\n", playablePath);
    strlcpy(lastPlayError_, "AUDIO_START_FAILED", sizeof(lastPlayError_));
    return false;
  }

  Serial.printf("[BLE] Tocando audio: %s\n", playablePath);
  display_.showAudioPlayback(audio_.playbackFileName(), 0,
                             audio_.volumePercent());
  return true;
}

void AppController::logEvent(const char* event, const char* detail) {
  if (event == nullptr || event[0] == '\0') return;
  if (!storage_.available()) return;
  // A biblioteca SD/SPI do Arduino ESP32 nao e reentrante. Durante PLAY, apenas
  // a tarefa de audio pode tocar no cartao para evitar corrupcoes e reinicios.
  if (audio_.storageBusy()) return;
  SD.mkdir("/sys");
  SD.mkdir("/sys/log");
  File file = SD.open("/sys/log/events.log", FILE_APPEND);
  if (!file) return;
  file.printf("%lu,%s,%s\n", static_cast<unsigned long>(millis()), event,
              detail == nullptr ? "" : detail);
  file.close();
}

bool AppController::buildMediaIndex() {
  if (!storage_.available() && !storage_.begin()) return false;
  SD.mkdir("/sys");
  SD.mkdir("/sys/db");
  scanAudioTestFiles();
  scanFaceFiles();

  File file = SD.open("/sys/db/media.idx", FILE_WRITE);
  if (!file) return false;
  file.printf("version=%s\n", board::kFirmwareVersion);
  file.printf("audio_count=%u\n", static_cast<unsigned>(audioTestFileCount_));
  for (size_t index = 0; index < audioTestFileCount_; ++index) {
    file.printf("audio=%s\n", audioTestFiles_[index]);
  }
  file.printf("face_count=%u\n", static_cast<unsigned>(faceFileCount_));
  for (size_t index = 0; index < faceFileCount_; ++index) {
    file.printf("face=%s\n", faceFiles_[index]);
  }
  file.close();
  logEvent("media_index", "/sys/db/media.idx");
  return true;
}

bool AppController::buildCatalogJson() {
  if (!storage_.available() && !storage_.begin()) return false;
  SD.mkdir("/sys");
  SD.mkdir("/sys/db");
  scanAudioTestFiles();
  scanFaceFiles();

  sdRemovePath("/sys/db/fefo.json");
  File file = SD.open("/sys/db/fefo.json", FILE_WRITE);
  if (!file) return false;

  file.println("{");
  file.printf("  \"firmware\": \"%s\",\n", board::kFirmwareVersion);
  file.printf("  \"protocol\": \"%s\",\n", board::kProtocolVersion);
  file.printf("  \"ble_name\": \"%s\",\n", board::kBleName);
  file.printf("  \"device_id\": \"%s\",\n", deviceId_);
  file.printf("  \"device_name\": \"%s\",\n", deviceName_);
  file.printf("  \"catalog_path\": \"%s\",\n", "/sys/db/fefo.json");
  file.printf("  \"volume\": %u,\n", audio_.volumePercent());
  file.printf("  \"brightness\": %u,\n", leds_.brightnessPercent());
  file.printf("  \"audio_count\": %u,\n",
              static_cast<unsigned>(audioTestFileCount_));
  file.println("  \"audios\": [");
  for (size_t index = 0; index < audioTestFileCount_; ++index) {
    file.printf("    {\"id\": %u, \"path\": \"%s\"}%s\n",
                static_cast<unsigned>(index + 1), audioTestFiles_[index],
                index + 1 < audioTestFileCount_ ? "," : "");
  }
  file.println("  ],");
  file.println("  \"led_effects\": [");
  file.println("    {\"id\":1,\"name\":\"Vermelho\",\"command\":\"LED 1\"},");
  file.println("    {\"id\":2,\"name\":\"Verde\",\"command\":\"LED 2\"},");
  file.println("    {\"id\":3,\"name\":\"Azul\",\"command\":\"LED 3\"},");
  file.println("    {\"id\":4,\"name\":\"Pisca branco\",\"command\":\"LED 4\"},");
  file.println("    {\"id\":5,\"name\":\"Ponto laranja\",\"command\":\"LED 5\"},");
  file.println("    {\"id\":6,\"name\":\"Roxo alternado\",\"command\":\"LED 6\"},");
  file.println("    {\"id\":7,\"name\":\"Arco-iris\",\"command\":\"LED 7\"},");
  file.println("    {\"id\":8,\"name\":\"Respiracao azul\",\"command\":\"LED 8\"},");
  file.println("    {\"id\":9,\"name\":\"Policia\",\"command\":\"LED 9\"},");
  file.println("    {\"id\":10,\"name\":\"Rastro laranja\",\"command\":\"LED 10\"}");
  file.println("  ],");
  file.println("  \"vibration_effects\": [");
  file.println("    {\"id\":1,\"name\":\"Leve\",\"command\":\"VIBRA 1\"},");
  file.println("    {\"id\":2,\"name\":\"Curta\",\"command\":\"VIBRA 2\"},");
  file.println("    {\"id\":3,\"name\":\"Media\",\"command\":\"VIBRA 3\"},");
  file.println("    {\"id\":4,\"name\":\"Longa\",\"command\":\"VIBRA 4\"},");
  file.println("    {\"id\":5,\"name\":\"Forte\",\"command\":\"VIBRA 5\"}");
  file.println("  ],");
  file.println("  \"uploads\": {");
  file.println("    \"audio\":\"/usr/a/\",");
  file.println("    \"faces\":\"/usr/f/\",");
  file.println("    \"led_config\":\"/usr/c/led.json\",");
  file.println("    \"vibration_config\":\"/usr/c/vibration.json\"");
  file.println("  },");
  file.printf("  \"face_count\": %u,\n", static_cast<unsigned>(faceFileCount_));
  file.println("  \"faces\": [");
  for (size_t index = 0; index < faceFileCount_; ++index) {
    file.printf("    {\"id\": %u, \"path\": \"%s\"}%s\n",
                static_cast<unsigned>(index + 1), faceFiles_[index],
                index + 1 < faceFileCount_ ? "," : "");
  }
  file.println("  ]");
  file.println("}");
  file.close();
  logEvent("catalog_build", "/sys/db/fefo.json");
  return true;
}

void AppController::updateBlePanel(bool force) {
  if (!blePanelActive_) return;

  const uint32_t nowMs = millis();
  const bool connected = ble_.connected();
  if (!force && connected == lastBleConnected_ &&
      nowMs - lastBlePanelUpdateMs_ < 1000) {
    return;
  }

  lastBleConnected_ = connected;
  lastBlePanelUpdateMs_ = nowMs;
  const char* audioPaths[kMaxAudioTestFiles]{};
  for (size_t index = 0; index < audioTestFileCount_; ++index) {
    audioPaths[index] = audioTestFiles_[index];
  }
  display_.showBlePanel(connected, true, lastBleCommand_, bleCommandCount_,
                        lastBleResponse_, bleResponseCount_,
                        audioPaths, audioTestFileCount_);
}

namespace {

bool fileExists(const char* path) {
  if (path == nullptr || path[0] == '\0') return false;
  char openablePath[64]{};
  return sdResolveOpenablePath(path, openablePath, sizeof(openablePath));
}

bool normalizeSdPath(const char* sourcePath, char* normalizedPath,
                     size_t normalizedSize) {
  if (sourcePath == nullptr) return false;
  if (sourcePath[0] == '/') {
    strlcpy(normalizedPath, sourcePath + 1, normalizedSize);
  } else {
    strlcpy(normalizedPath, sourcePath, normalizedSize);
  }
  return true;
}

bool findAudioFileInDir(const char* directory, const char* fileName,
                        char* resolvedPath, size_t resolvedSize) {
  File dir = SD.open(directory);
  if (!dir || !dir.isDirectory()) {
    if (dir) dir.close();
    return false;
  }

  File entry = dir.openNextFile();
  while (entry) {
    if (!entry.isDirectory()) {
      const char* name = entry.name();
      const char* baseName = strrchr(name, '/');
      if (baseName == nullptr) baseName = name;
      else
        baseName += 1;
      if (strcmp(baseName, fileName) == 0) {
        snprintf(resolvedPath, resolvedSize, "%s/%s", directory, fileName);
        entry.close();
        dir.close();
        return true;
      }
    }
    entry.close();
    entry = dir.openNextFile();
  }
  dir.close();
  return false;
}

bool resolveAudioTestPath(const char* sourcePath, char* resolvedPath,
                          size_t resolvedSize) {
  if (sourcePath == nullptr || sourcePath[0] == '\0') return false;
  const size_t kAudioTestPathLength = 64;
  char normalized[kAudioTestPathLength];
  normalizeSdPath(sourcePath, normalized, sizeof(normalized));
  if (sdResolveOpenablePath(normalized, resolvedPath, resolvedSize)) {
    return true;
  }

  const char* fileName = strrchr(normalized, '/');
  if (fileName == nullptr) fileName = normalized;
  else
    fileName += 1;

  const char* candidates[] = {"usr/a", "a", "sys/a"};
  for (const char* directory : candidates) {
    char candidatePath[kAudioTestPathLength];
    snprintf(candidatePath, sizeof(candidatePath), "%s/%s", directory,
             fileName);
    if (sdResolveOpenablePath(candidatePath, resolvedPath, resolvedSize)) {
      Serial.printf("[AUDIO TEST] Caminho resolvido: %s -> %s\n", sourcePath,
                    resolvedPath);
      return true;
    }
  }

  return false;
}

}  // namespace

void AppController::startAudioTestSequence() {
  audioTestActive_ = false;
  audioTestPlaybackPending_ = false;
  currentAudioIndex_ = 0;
  audioTestFileCount_ = 0;

  if (!storage_.available()) {
    Serial.println("[AUDIO TEST] SD nao disponivel.");
    return;
  }

  display_.showAudioPlayback("Procurando arquivos", 0,
                             audio_.volumePercent());

  if (!scanAudioTestFiles()) {
    Serial.println("[AUDIO TEST] Nenhum arquivo de audio encontrado.");
    display_.showAudioPlayback("SEM ARQUIVOS", 0,
                               audio_.volumePercent());
    return;
  }

  audioTestActive_ = true;
  startNextAudioTest();
}

bool AppController::startNextAudioTest() {
  if (currentAudioIndex_ >= audioTestFileCount_) return false;

  if (!storage_.available()) {
    Serial.println("[AUDIO TEST] SD nao disponivel.");
    return false;
  }

  const char* path = audioTestFiles_[currentAudioIndex_];
  if (!SD.exists(path)) {
    Serial.printf("[AUDIO TEST] Arquivo desapareceu: %s\n", path);
    currentAudioIndex_++;
    return startNextAudioTest();
  }

  if (audio_.playWavFile(path)) {
    audioTestPlaybackPending_ = true;
    Serial.printf("[AUDIO TEST] Iniciando audio %s\n", path);
    display_.showAudioPlayback(audio_.playbackFileName(), 0,
                               audio_.volumePercent());
    return true;
  }

  Serial.printf("[AUDIO TEST] Falha ao iniciar audio: %s\n", path);
  currentAudioIndex_++;
  return startNextAudioTest();
}

bool AppController::scanAudioTestFiles() {
  audioTestFileCount_ = 0;
  const char* directories[] = {"/usr/a", "usr/a", "/a", "a", "/sys/a", "sys/a"};
  bool foundAny = false;
  for (const char* dir : directories) {
    if (collectAudioTestFiles(dir)) foundAny = true;
  }
  return foundAny;
}

bool AppController::collectAudioTestFiles(const char* directory, int depth) {
  if (depth > 4) return false;

  File dir = SD.open(directory);
  if (!dir || !dir.isDirectory()) {
    if (dir) dir.close();
    return false;
  }

  File entry = dir.openNextFile();
  while (entry) {
    if (entry.isDirectory()) {
      const char* subdirName = entry.name();
      char subdirPath[kMaxAudioTestPathLength];
      if (strcmp(directory, "/") == 0) {
        snprintf(subdirPath, sizeof(subdirPath), "/%s", subdirName);
      } else {
        snprintf(subdirPath, sizeof(subdirPath), "%s/%s", directory,
                 subdirName);
      }
      collectAudioTestFiles(subdirPath, depth + 1);
    } else {
      const char* name = entry.name();
      const char* ext = strrchr(name, '.');
      if (ext != nullptr) {
        const char* normalizedExt = ext + 1;
        if (strcasecmp(normalizedExt, "wav") == 0) {
          char fullPath[kMaxAudioTestPathLength];
          if (strcmp(directory, "/") == 0) {
            snprintf(fullPath, sizeof(fullPath), "/%s", name);
          } else {
            snprintf(fullPath, sizeof(fullPath), "%s/%s", directory,
                     name);
          }
          if (addAudioTestFile(fullPath)) {
            Serial.printf("[AUDIO TEST] Arquivo encontrado: %s\n",
                          fullPath);
          }
        }
      }
    }
    entry.close();
    entry = dir.openNextFile();
  }
  dir.close();
  return audioTestFileCount_ > 0;
}

bool AppController::addAudioTestFile(const char* path) {
  if (audioTestFileCount_ >= kMaxAudioTestFiles) return false;
  for (size_t index = 0; index < audioTestFileCount_; ++index) {
    if (strcmp(audioTestFiles_[index], path) == 0) return false;
  }
  strlcpy(audioTestFiles_[audioTestFileCount_], path,
          kMaxAudioTestPathLength);
  audioTestFileCount_++;
  return true;
}

bool AppController::scanFaceFiles() {
  faceFileCount_ = 0;
  const char* directories[] = {"/usr/f", "usr/f", "/f", "f", "/sys/f", "sys/f"};
  bool foundAny = false;
  for (const char* dir : directories) {
    if (collectFaceFiles(dir)) foundAny = true;
  }
  return foundAny;
}

bool AppController::collectFaceFiles(const char* directory, int depth) {
  if (depth > 4) return false;

  File dir = SD.open(directory);
  if (!dir || !dir.isDirectory()) {
    if (dir) dir.close();
    return false;
  }

  File entry = dir.openNextFile();
  while (entry) {
    if (entry.isDirectory()) {
      const char* subdirName = entry.name();
      char subdirPath[kMaxFacePathLength];
      if (strcmp(directory, "/") == 0) {
        snprintf(subdirPath, sizeof(subdirPath), "/%s", subdirName);
      } else {
        snprintf(subdirPath, sizeof(subdirPath), "%s/%s", directory,
                 subdirName);
      }
      collectFaceFiles(subdirPath, depth + 1);
    } else {
      const char* name = entry.name();
      const char* ext = strrchr(name, '.');
      if (ext != nullptr) {
        const char* normalizedExt = ext + 1;
        if (strcasecmp(normalizedExt, "bin") == 0 ||
            strcasecmp(normalizedExt, "raw") == 0) {
          char fullPath[kMaxFacePathLength];
          if (strcmp(directory, "/") == 0) {
            snprintf(fullPath, sizeof(fullPath), "/%s", name);
          } else {
            snprintf(fullPath, sizeof(fullPath), "%s/%s", directory,
                     name);
          }
          if (addFaceFile(fullPath)) {
            Serial.printf("[FACES] Arquivo encontrado: %s\n",
                          fullPath);
          }
        }
      }
    }
    entry.close();
    entry = dir.openNextFile();
  }
  dir.close();
  return faceFileCount_ > 0;
}

bool AppController::addFaceFile(const char* path) {
  if (faceFileCount_ >= kMaxFaceFiles) return false;
  for (size_t index = 0; index < faceFileCount_; ++index) {
    if (strcmp(faceFiles_[index], path) == 0) return false;
  }
  strlcpy(faceFiles_[faceFileCount_], path, kMaxFacePathLength);
  faceFileCount_++;
  return true;
}

void AppController::transitionTo(SystemState nextState) {
  if (state_ == nextState) return;
  Serial.printf("[STATE] %s -> %s\n", systemStateName(state_),
                systemStateName(nextState));
  state_ = nextState;
  ble_.publishState(state_);
}

}  // namespace fefo
