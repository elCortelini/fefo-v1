#pragma once

#include <cstdint>

namespace fefo {

struct MicrophoneReading {
  uint16_t minimum{0};
  uint16_t maximum{0};
  uint16_t bias{0};
  uint16_t rms{0};
  uint16_t peakToPeak{0};
  uint8_t levelPercent{0};
  uint8_t peakPercent{0};
  bool clipping{false};
};

// Responsável exclusivamente pelo MAX9814 ligado ao ADC1 do GPIO 35.
class MicrophoneService {
 public:
  bool begin();
  MicrophoneReading read();
  uint16_t noiseFloorRms() const { return noiseFloorRms_; }

 private:
  MicrophoneReading captureWindow();

  uint16_t noiseFloorRms_{8};
  float smoothedLevel_{0.0F};
  uint8_t heldPeak_{0};
};

}  // namespace fefo
