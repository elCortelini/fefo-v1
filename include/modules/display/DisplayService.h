#pragma once

#include <TFT_eSPI.h>

#include "core/SystemState.h"

namespace fefo {

// Controla exclusivamente display e backlight usando a configuração TFT_eSPI
// comprovada pelo FEFO 190. Outros módulos nunca desenham diretamente na TFT.
class DisplayService {
 public:
  bool begin();
  void showSystemState(SystemState state, bool storageAvailable);
  void beginVuMeter(bool microphoneAvailable, uint16_t noiseFloorRms);
  void showVuMeter(uint8_t levelPercent, uint8_t peakPercent, uint16_t rms,
                   uint16_t bias, uint16_t peakToPeak, bool clipping,
                   bool motorActive);
  bool available() const { return available_; }

 private:
  TFT_eSPI tft_;
  bool available_{false};
  bool vuMeterReady_{false};
};

}  // namespace fefo
