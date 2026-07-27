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
  void stop();

 private:
  void showColor(uint8_t red, uint8_t green, uint8_t blue, uint32_t durationMs);
  void showBitBangDiagnosticPhase();

  Adafruit_NeoPixel strip_{board::kNeoPixelCount, board::kNeoPixel,
                           NEO_GRB + NEO_KHZ800};
  bool bitBangDiagnosticActive_{false};
  uint8_t bitBangDiagnosticPhase_{0};
  uint32_t bitBangDiagnosticChangedAtMs_{0};
};

}  // namespace fefo
