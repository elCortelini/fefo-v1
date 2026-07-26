#include "modules/display/DisplayService.h"

#include <Arduino.h>

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
                                 uint16_t peakToPeak, bool clipping) {
  if (!available_ || !vuMeterReady_) return;

  constexpr int kMeterX = 40;
  constexpr int kMeterY = 118;
  constexpr int kSegments = 20;
  constexpr int kSegmentPitch = 20;
  constexpr int kSegmentWidth = 16;
  constexpr int kSegmentHeight = 46;
  const int activeSegments = (levelPercent * kSegments + 99) / 100;
  const int peakSegment = min(kSegments - 1, peakPercent * kSegments / 101);

  for (int segment = 0; segment < kSegments; ++segment) {
    uint16_t color = TFT_DARKGREY;
    if (segment < activeSegments) {
      color = segment < 13 ? TFT_GREEN : (segment < 17 ? TFT_YELLOW : TFT_RED);
    }
    if (segment == peakSegment && peakPercent > 0) color = TFT_WHITE;
    tft_.fillRect(kMeterX + segment * kSegmentPitch, kMeterY,
                  kSegmentWidth, kSegmentHeight, color);
  }

  char levelText[16];
  snprintf(levelText, sizeof(levelText), "%3u%%", levelPercent);
  tft_.fillRect(140, 178, 200, 42, TFT_BLACK);
  tft_.setTextDatum(MC_DATUM);
  tft_.setTextColor(clipping ? TFT_RED : TFT_CYAN, TFT_BLACK);
  tft_.drawString(levelText, tft_.width() / 2, 198, 4);

  char details[80];
  snprintf(details, sizeof(details), "RMS:%4u   P-P:%4u   BIAS:%4u",
           rms, peakToPeak, bias);
  tft_.fillRect(25, 230, 430, 48, TFT_BLACK);
  tft_.setTextColor(TFT_WHITE, TFT_BLACK);
  tft_.drawString(details, tft_.width() / 2, 242, 2);
  tft_.setTextColor(clipping ? TFT_RED : TFT_GREEN, TFT_BLACK);
  tft_.drawString(clipping ? "SATURACAO" : "SINAL OK",
                  tft_.width() / 2, 268, 2);
}

}  // namespace fefo
