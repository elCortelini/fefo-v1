#include "modules/display/DisplayService.h"

#include <Arduino.h>
#include <SD.h>

#include "board/Fefo35Board.h"

namespace fefo {

bool DisplayService::begin() {
  // Backlight inicia desligado para ocultar ruído durante o reset do painel.
  pinMode(board::kBacklight, OUTPUT);
  digitalWrite(board::kBacklight, LOW);

  tft_.init();
  tft_.setRotation(1);
  tft_.setSwapBytes(true);
  tft_.fillScreen(TFT_BLACK);
  available_ = true;

  // Tela de teste com borda e barras RGB: facilita detectar recorte, inversão
  // de cores e orientação errada sem depender de arquivos do cartão.
  tft_.drawRect(0, 0, tft_.width(), tft_.height(), TFT_WHITE);
  const int barWidth = tft_.width() / 3;
  tft_.fillRect(1, 1, barWidth - 1, 8, TFT_RED);
  tft_.fillRect(barWidth, 1, barWidth, 8, TFT_GREEN);
  tft_.fillRect(barWidth * 2, 1, tft_.width() - barWidth * 2 - 1, 8, TFT_BLUE);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(TFT_CYAN, TFT_BLACK);
  char firmwareTitle[32];
  snprintf(firmwareTitle, sizeof(firmwareTitle), "FEFO V%s",
           board::kFirmwareVersion);
  tft_.drawString(firmwareTitle, tft_.width() / 2,
                  tft_.height() / 2 - 22, 4);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString("FASE 0 - SELF TEST", tft_.width() / 2,
                  tft_.height() / 2 + 18, 2);
  digitalWrite(board::kBacklight, HIGH);

  Serial.printf("[DISPLAY] ILI9488 iniciado: logico=%dx%d, esperado=%ux%u.\n",
                tft_.width(), tft_.height(), board::kDisplayWidth,
                board::kDisplayHeight);
  return true;
}

void DisplayService::showSystemState(SystemState state, bool storageAvailable) {
  if (!available_) return;

  const uint16_t stateColor =
      state == SystemState::kReady ? TFT_GREEN : TFT_ORANGE;
  tft_.fillRect(20, tft_.height() - 70, tft_.width() - 40, 52, TFT_BLACK);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(stateColor, TFT_BLACK);
  tft_.drawString(systemStateName(state), tft_.width() / 2,
                  tft_.height() - 55, 4);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  char serviceStatus[64];
  snprintf(serviceStatus, sizeof(serviceStatus), "SD: %s  |  BLE: %s",
           storageAvailable ? "OK" : "FALHA", board::kBleName);
  tft_.drawString(serviceStatus, tft_.width() / 2,
                  tft_.height() - 25, 2);
}

void DisplayService::beginVuMeter(bool microphoneAvailable,
                                  uint16_t noiseFloorRms) {
  if (!available_) return;

  tft_.fillScreen(TFT_BLACK);
  tft_.drawRect(0, 0, tft_.width(), tft_.height(), TFT_WHITE);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(TFT_CYAN, TFT_BLACK);
  tft_.drawString("MAX9814 - VU METER", tft_.width() / 2, 30, 4);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString("GPIO 35 / ADC1", tft_.width() / 2, 62, 2);

  if (!microphoneAvailable) {
    tft_.setTextColor(TFT_RED, TFT_BLACK);
    tft_.drawString("MICROFONE FORA DA FAIXA", tft_.width() / 2,
                    tft_.height() / 2, 4);
    vuMeterReady_ = false;
    return;
  }

  char calibration[48];
  snprintf(calibration, sizeof(calibration), "Piso de ruido RMS: %u",
           noiseFloorRms);
  tft_.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft_.drawString(calibration, tft_.width() / 2, 88, 2);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString("Fale, bata palmas ou aproxime uma fonte sonora",
                  tft_.width() / 2, 295, 2);
  vuMeterReady_ = true;
}

void DisplayService::showVuMeter(uint8_t levelPercent, uint8_t peakPercent,
                                 uint16_t rms, uint16_t bias,
                                 uint16_t peakToPeak, bool clipping,
                                 bool motorActive) {
  if (!available_ || !vuMeterReady_) return;

  constexpr int kMeterX = 40;
  constexpr int kMeterY = 118;
  constexpr int kSegments = board::kVuSegmentCount;
  constexpr int kSegmentPitch = 20;
  constexpr int kSegmentWidth = 16;
  constexpr int kSegmentHeight = 46;
  const int activeSegments = (levelPercent * kSegments + 99) / 100;
  const int peakSegment = min(kSegments - 1, peakPercent * kSegments / 101);

  for (int segment = 0; segment < kSegments; ++segment) {
    // Quando o motor está ligado, os segmentos vazios ficam em vermelho
    // escuro e os ativos em vermelho vivo. Assim o medidor inteiro continua
    // vermelho mesmo durante os três segundos finais de silêncio.
    uint16_t color = motorActive ? TFT_MAROON : TFT_DARKGREY;
    if (segment < activeSegments) {
      color = motorActive
                  ? TFT_RED
                  : (segment < 13 ? TFT_GREEN
                                  : (segment < 17 ? TFT_YELLOW : TFT_RED));
    }
    if (!motorActive && segment == peakSegment && peakPercent > 0) {
      color = TFT_WHITE;
    }
    tft_.fillRect(kMeterX + segment * kSegmentPitch, kMeterY,
                  kSegmentWidth, kSegmentHeight, color);
  }

  char levelText[16];
  snprintf(levelText, sizeof(levelText), "%3u%%", levelPercent);
  tft_.fillRect(140, 178, 200, 42, TFT_BLACK);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(motorActive || clipping ? TFT_RED : TFT_CYAN, TFT_BLACK);
  tft_.drawString(levelText, tft_.width() / 2, 198, 4);

  char details[80];
  snprintf(details, sizeof(details), "RMS:%4u   P-P:%4u   BIAS:%4u",
           rms, peakToPeak, bias);
  tft_.fillRect(25, 230, 430, 48, TFT_BLACK);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(details, tft_.width() / 2, 242, 2);
  tft_.setTextColor(motorActive || clipping ? TFT_RED : TFT_GREEN, TFT_BLACK);
  tft_.drawString(motorActive ? "MOTOR ATIVO"
                              : (clipping ? "SATURACAO" : "SINAL OK"),
                  tft_.width() / 2, 268, 2);
}

void DisplayService::showAudioPlayback(const char* filename,
                                      uint8_t progressPercent,
                                      uint8_t volumePercent) {
  if (!available_) return;

  tft_.fillScreen(TFT_BLACK);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(TFT_CYAN, TFT_BLACK);
  tft_.drawString("AUDIO TEST", tft_.width() / 2, 22, 4);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(board::kFirmwareVersion, tft_.width() / 2, 52, 2);

  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString("Arquivo:", 40, 88, 2);
  tft_.drawString(filename, 40, 112, 2);

  tft_.drawString("Progresso:", 40, 170, 2);
  tft_.fillRoundRect(40, 188, 400, 24, 6, TFT_DARKGREY);
  if (progressPercent > 0) {
    const int width = (progressPercent * 396) / 100;
    tft_.fillRoundRect(42, 190, width, 20, 4, TFT_GREEN);
  }

  char percentText[16];
  snprintf(percentText, sizeof(percentText), "%u%%", progressPercent);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(percentText, 240, 214, 2);

  char volumeText[32];
  snprintf(volumeText, sizeof(volumeText), "Volume fixo: %u%%", volumePercent);
  tft_.drawString(volumeText, 40, 260, 2);
}

void DisplayService::showWifiTransfer(const char* filename, uint32_t received,
                                      uint32_t total) {
  if (!available_) return;
  const uint8_t percent = total == 0
                              ? 0
                              : static_cast<uint8_t>(min<uint32_t>(
                                    100, (received * 100ULL) / total));
  const bool newFile = strncmp(transferFile_, filename ? filename : "",
                               sizeof(transferFile_)) != 0;
  if (newFile || transferPercent_ == 255) {
    strlcpy(transferFile_, filename ? filename : "", sizeof(transferFile_));
    tft_.fillScreen(TFT_BLACK);
    tft_.drawRect(0, 0, tft_.width(), tft_.height(), TFT_WHITE);
    tft_.setTextDatum(MC_DATUM);
    tft_.setTextColor(TFT_CYAN, TFT_BLACK);
    tft_.drawString("ATUALIZANDO FEFO", tft_.width() / 2, 35, 4);
    tft_.setTextColor(TFT_WHITE, TFT_BLACK);
    tft_.drawString("Recebendo arquivo", tft_.width() / 2, 78, 2);
    char preview[58]{};
    strlcpy(preview, transferFile_, sizeof(preview));
    tft_.drawString(preview, tft_.width() / 2, 108, 2);
    tft_.fillRoundRect(38, 155, 404, 34, 8, TFT_DARKGREY);
    tft_.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft_.drawString("Nao desligue o FEFO", tft_.width() / 2, 270, 2);
  }
  if (!newFile && percent == transferPercent_) return;
  transferPercent_ = percent;
  tft_.fillRoundRect(40, 157, 400, 30, 6, TFT_DARKGREY);
  if (percent > 0) {
    tft_.fillRoundRect(40, 157, (400 * percent) / 100, 30, 6, TFT_GREEN);
  }
  tft_.fillRect(130, 205, 220, 42, TFT_BLACK);
  char progress[32]{};
  snprintf(progress, sizeof(progress), "%u%%", percent);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(progress, tft_.width() / 2, 224, 4);
}

void DisplayService::showBleCommand(const char* command) {
  if (!available_) return;

  tft_.fillScreen(TFT_NAVY);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(TFT_YELLOW, TFT_NAVY);
  tft_.drawString("BLE CMD RECEBIDO", tft_.width() / 2, 34, 4);
  tft_.setTextColor(TFT_WHITE, TFT_NAVY);
  tft_.drawString(board::kBleName, tft_.width() / 2, 70, 2);

  tft_.setTextDatum(TL_DATUM);
  tft_.setTextColor(TFT_WHITE, TFT_NAVY);
  tft_.drawString("Comando:", 28, 118, 2);
  tft_.setTextColor(TFT_CYAN, TFT_NAVY);
  tft_.drawString(command == nullptr ? "" : command, 28, 148, 2);
}

void DisplayService::showBlePanel(bool connected, bool readyForCommand,
                                  const char* lastCommand,
                                  uint32_t commandCount,
                                  const char* lastResponse,
                                  uint32_t responseCount,
                                  const char* const* audioFiles,
                                  size_t audioFileCount) {
  if (!available_) return;

  tft_.fillScreen(TFT_BLACK);
  tft_.drawRect(0, 0, tft_.width(), tft_.height(), TFT_WHITE);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(TFT_CYAN, TFT_BLACK);
  tft_.drawString("PAINEL BLE", tft_.width() / 2, 28, 4);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(board::kBleName, tft_.width() / 2, 60, 2);

  tft_.setTextDatum(TL_DATUM);
  tft_.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft_.drawString("Conexao:", 30, 100, 2);
  tft_.setTextColor(connected ? TFT_GREEN : TFT_RED, TFT_BLACK);
  tft_.drawString(connected ? "CONECTADO" : "DESCONECTADO", 160, 100, 2);

  tft_.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft_.drawString("Comando:", 30, 135, 2);
  tft_.setTextColor(readyForCommand ? TFT_GREEN : TFT_ORANGE, TFT_BLACK);
  tft_.drawString(readyForCommand ? "PRONTO PARA RECEBER" : "AGUARDANDO BLE",
                  160, 135, 2);

  char countText[40];
  snprintf(countText, sizeof(countText), "Recebidos: %lu",
           static_cast<unsigned long>(commandCount));
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(countText, 30, 175, 2);

  tft_.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft_.drawString("Ultimo comando:", 30, 215, 2);
  tft_.setTextColor(commandCount > 0 ? TFT_YELLOW : TFT_DARKGREY, TFT_BLACK);
  tft_.drawString(commandCount > 0 ? lastCommand : "nenhum recebido",
                  30, 238, 2);

  char txCountText[40];
  snprintf(txCountText, sizeof(txCountText), "TX enviados: %lu",
           static_cast<unsigned long>(responseCount));
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(txCountText, 270, 175, 2);

  tft_.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft_.drawString("Ultima resposta TX:", 30, 262, 2);
  tft_.setTextColor(responseCount > 0 ? TFT_GREEN : TFT_DARKGREY, TFT_BLACK);
  char responsePreview[54]{};
  strlcpy(responsePreview,
          responseCount > 0 ? lastResponse : "nenhuma enviada",
          sizeof(responsePreview));
  tft_.drawString(responsePreview, 30, 282, 1);

  tft_.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft_.drawString("WAV no SD:", 30, 298, 1);
  if (audioFileCount == 0 || audioFiles == nullptr) {
    tft_.setTextColor(TFT_RED, TFT_BLACK);
    tft_.drawString("nenhum .wav encontrado", 100, 298, 1);
    return;
  }

  const size_t visibleCount = min<size_t>(audioFileCount, 2);
  for (size_t index = 0; index < visibleCount; ++index) {
    char line[88];
    snprintf(line, sizeof(line), "%u: %s", static_cast<unsigned>(index + 1),
             audioFiles[index]);
    tft_.setTextColor(TFT_GREEN, TFT_BLACK);
    tft_.drawString(line, 100, 298 + static_cast<int>(index) * 10, 1);
  }
}

void DisplayService::showFaceFile(const char* path) {
  if (!available_ || path == nullptr || path[0] == '\0') return;
  Serial.printf("[DISPLAY] solicitada face: %s\n", path);
  File f = SD.open(path);
  if (!f) {
    Serial.printf("[DISPLAY] falha ao abrir: %s\n", path);
    return;
  }

  const int w = board::kDisplayWidth;
  const int h = board::kDisplayHeight;

  // Buffer por linha para evitar alocar todo o quadro na RAM
  // cada pixel é uint16_t (2 bytes)
  uint16_t* row = reinterpret_cast<uint16_t*>(malloc(w * sizeof(uint16_t)));
  if (!row) {
    f.close();
    return;
  }

  tft_.startWrite();
  for (int y = 0; y < h; ++y) {
    size_t need = w * 2;
    size_t read = f.read(reinterpret_cast<uint8_t*>(row), need);
    if (read != need) {
      Serial.printf("[DISPLAY] leitura incompleta (%u/%u) em %s\n", (unsigned)read, (unsigned)need, path);
      break;
    }
    // desenha uma linha
    tft_.pushImage(0, y, w, 1, row);
  }
  tft_.endWrite();

  free(row);
  f.close();
}

}  // namespace fefo
