#pragma once

#include <Arduino.h>

#include "LedBitBangDriver.h"

namespace fefo::led_test {

inline constexpr uint8_t kPatternCount = 5;
inline constexpr uint32_t kPatternDurationMs = 2000;
// 25 ms divide exatamente os passos internos de 125 e 250 ms. A TFT pode ser
// atualizada mais devagar; este intervalo governa o quadro elétrico dos LEDs.
inline constexpr uint32_t kFrameIntervalMs = 25;

struct PatternInfo {
  const char* name;
  const char* description;
};

// Gera os cinco padrões sem delays. A troca exata a cada dois segundos permite
// que a tela, o Serial e a fita permaneçam sincronizados indefinidamente.
class LedPatternPlayer {
 public:
  void begin(uint32_t nowMs);
  bool update(uint32_t nowMs);

  const RgbColor* pixels() const { return pixels_; }
  uint8_t patternIndex() const { return patternIndex_; }
  uint32_t patternElapsedMs(uint32_t nowMs) const;
  uint32_t patternRemainingMs(uint32_t nowMs) const;
  uint32_t completedLoops() const { return completedLoops_; }
  const PatternInfo& info() const;

 private:
  void render(uint32_t elapsedMs);
  void clearPixels();

  RgbColor pixels_[kLedCount]{};
  uint8_t patternIndex_{0};
  uint32_t patternStartedAtMs_{0};
  uint32_t renderedFrame_{UINT32_MAX};
  uint32_t completedLoops_{0};
};

}  // namespace fefo::led_test
