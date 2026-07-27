#pragma once

#include <Arduino.h>

#include "LedBitBangDriver.h"

namespace fefo::led_test {

inline constexpr uint8_t kTransportCount = 5;

struct TransportInfo {
  const char* name;
  const char* detail;
};

// Centraliza somente a seleção dos meios de transporte. Os padrões continuam
// independentes, permitindo enviar exatamente o mesmo vetor aos cinco drivers.
class LedTransportLab {
 public:
  void prepareElectricalProbe();
  void setProbeLevel(bool high);
  bool readProbeLevel() const;
  void releaseElectricalProbe();

  bool select(uint8_t transportIndex);
  void show(const RgbColor* pixels, size_t count, uint8_t patternIndex);
  void clear();
  void release();

  uint8_t activeIndex() const { return activeTransport_; }
  const TransportInfo& info() const;
  const char* activeDetail(uint8_t patternIndex);

 private:
  uint8_t activeTransport_{0};
  uint8_t activePattern_{0};
  bool selected_{false};
};

}  // namespace fefo::led_test
