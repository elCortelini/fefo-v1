#pragma once

#include <Adafruit_NeoPixel.h>

#include "board/Fefo35Board.h"

namespace fefo {

// Proprietário da fita NeoPixel. Na Fase 0 mantém o sinal em nível seguro.
class LedService {
 public:
  bool begin();
  void selfTest();
  void stop();

 private:
  void showColor(uint8_t red, uint8_t green, uint8_t blue, uint32_t durationMs);

  Adafruit_NeoPixel strip_{board::kNeoPixelCount, board::kNeoPixel,
                           NEO_GRB + NEO_KHZ800};
};

}  // namespace fefo
