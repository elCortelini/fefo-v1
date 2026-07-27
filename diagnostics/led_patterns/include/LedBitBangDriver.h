#pragma once

#include <Arduino.h>

namespace fefo::led_test {

// Cor lógica em ordem RGB. O driver converte internamente para a ordem GRB
// exigida pelos LEDs usados neste protótipo.
struct RgbColor {
  uint8_t red;
  uint8_t green;
  uint8_t blue;
};

inline constexpr uint8_t kLedPin = 22;
inline constexpr size_t kLedCount = 15;
inline constexpr uint8_t kBitBangProfileCount = 5;

// Transporte mínimo, independente de Adafruit NeoPixel e do periférico RMT.
// Ele reproduz o sinal direto testado na V0.0.2. A execucao foi confirmada
// pela Serial, mas a resposta fisica da fita continua sem aprovacao.
class LedBitBangDriver {
 public:
  bool begin();
  bool setTimingProfile(uint8_t profileIndex);
  void show(const RgbColor* pixels, size_t count);
  void clear();
  const char* timingName() const;

 private:
  uint8_t timingProfile_{0};
};

}  // namespace fefo::led_test
