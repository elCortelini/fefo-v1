#pragma once

#include <Arduino.h>

#include "LedBitBangDriver.h"

namespace fefo::led_test {

// Converte cada bit WS2812 em três bits SPI: 0=100 e 1=110. A 2,4 MHz, cada
// trio dura 1,25 us e o GPIO 22 é dirigido inteiramente pelo periférico HSPI.
class SpiEncodedDriver {
 public:
  bool begin();
  void show(const RgbColor* pixels, size_t count);
  void clear();
  void end();

 private:
  bool ready_{false};
};

}  // namespace fefo::led_test
