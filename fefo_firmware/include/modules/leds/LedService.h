#pragma once

#include <Adafruit_NeoPixel.h>

#include "board/Fefo35Board.h"

namespace fefo {

// Proprietário da fita NeoPixel. Na Fase 0 mantém o sinal em nível seguro.
class LedService {
 public:
  bool begin();
  void selfTest();
  bool startBitBangDiagnostic();
  void updateBitBangDiagnostic(uint32_t nowMs);
  void update(uint32_t nowMs, bool panicActive, bool audioActive,
              uint8_t audioLevelPercent);
  void setBrightnessPercent(uint8_t percent);
  uint8_t brightnessPercent() const { return brightnessPercent_; }
  bool setPattern(uint8_t pattern);
  uint8_t pattern() const { return selectedPattern_; }
  void stop();

 private:
  void showColor(uint8_t red, uint8_t green, uint8_t blue, uint32_t durationMs);
  void showBitBangDiagnosticPhase();
  void showAudioVu(uint8_t levelPercent);
  void showCalm(uint32_t nowMs);
  void showSelectedPattern(uint32_t nowMs);

  Adafruit_NeoPixel strip_{board::kNeoPixelCount, board::kNeoPixel,
                           NEO_GRB + NEO_KHZ800};
  bool bitBangDiagnosticActive_{false};
  uint8_t bitBangDiagnosticPhase_{0};
  uint32_t bitBangDiagnosticChangedAtMs_{0};

  bool panicActive_{false};
  uint8_t brightnessPercent_{30};
  uint8_t selectedPattern_{0};
  uint8_t ledPhase_{0};
  uint32_t lastLedUpdateMs_{0};
};

}  // namespace fefo
