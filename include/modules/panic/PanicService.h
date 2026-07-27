#pragma once

#include <cstdint>

#include "modules/audio/AudioService.h"
#include "modules/noise/NoiseResponseController.h"
#include "modules/vibration/VibrationService.h"

namespace fefo {

// Coordena o modo pânico sem assumir a implementação dos periféricos. A
// detecção permanece no controlador de ruído, o motor no serviço de vibração e
// o alerta sonoro no serviço de áudio. Futuramente, AudioService poderá trocar
// a sirene sintetizada por um arquivo do microSD sem alterar esta interface.
class PanicService {
 public:
  bool begin();
  void update(uint8_t levelPercent, uint32_t nowMs,
              VibrationService& vibration, AudioService& audio);

  bool enabled() const { return true; }
  NoiseResponseState state() const { return noiseResponse_.state(); }

 private:
  NoiseResponseController noiseResponse_;
};

}  // namespace fefo
