#pragma once

#include <cstdint>

namespace fefo {

// Nesta fase, garante somente o estado elétrico seguro do amplificador.
// WAV e I2S/DMA serão adicionados isoladamente na fase de migração de áudio.
class AudioService {
 public:
  bool begin();
  void selfTest();
 void stop();

 private:
  bool beginDma();
  void endDma();
  bool writeDmaTone(float frequencyHz, uint32_t durationMs,
                    uint8_t amplitude);
  bool writeDmaRamp(uint8_t from, uint8_t to, uint32_t durationMs);
};

}  // namespace fefo
