#pragma once

#include <Arduino.h>
#include <SPI.h>

namespace fefo {

// Proprietário exclusivo do barramento e do sistema de arquivos do microSD.
// Futuras leituras e escritas deverão passar por esta classe e seu mutex.
class StorageService {
 public:
  bool begin();
  // Garante a estrutura oficial do FEFO sem formatar nem apagar o cartão.
  bool initializeFefoLayout();
  bool available() const { return available_; }
  uint64_t capacityBytes() const { return capacityBytes_; }
  uint64_t usedBytes() const { return usedBytes_; }

 private:
  // O TFT usa VSPI. O microSD permanece no HSPI, como no FEFO 190, para que
  // os dois periféricos possam operar simultaneamente sem reconfigurar o bus.
  SPIClass spi_{HSPI};
  bool available_{false};
  uint64_t capacityBytes_{0};
  uint64_t usedBytes_{0};
};

}  // namespace fefo
