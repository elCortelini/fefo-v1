#pragma once

#include <NimBLEDevice.h>

#include "core/SystemState.h"

namespace fefo {

// Serviço BLE mínimo da Fase 0. Publica identidade e estado; comandos e
// transferência entrarão em módulos próprios nas próximas etapas.
class BleService {
 public:
  bool begin();
  void publishState(SystemState state);
  bool connected() const { return connected_; }
  void setConnected(bool connected) { connected_ = connected; }

 private:
  NimBLECharacteristic* statusCharacteristic_{nullptr};
  bool connected_{false};
};

}  // namespace fefo

