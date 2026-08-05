#pragma once

#include <cstddef>
#include <string>

#include <freertos/FreeRTOS.h>
#include <freertos/portmacro.h>
#include <BLEDevice.h>

#include "core/SystemState.h"

namespace fefo {

// Serviço BLE mínimo da Fase 0. Publica identidade e estado; comandos e
// transferência entrarão em módulos próprios nas próximas etapas.
class BleService {
 public:
  bool begin();
  void publishState(SystemState state);
  void sendLine(const char* line);
  void receiveCommand(const std::string& command);
  bool takeCommand(char* output, size_t outputSize);
  bool connected() const { return connected_; }
  bool shuttingDown() const { return shuttingDown_; }
  void shutdown();
  void setConnected(bool connected) { connected_ = connected; }

 private:
  BLECharacteristic* uartRxCharacteristic_{nullptr};
  BLECharacteristic* uartTxCharacteristic_{nullptr};
  portMUX_TYPE commandMux_ = portMUX_INITIALIZER_UNLOCKED;
  char pendingCommand_[256]{};
  bool commandPending_{false};
  bool connected_{false};
  bool shuttingDown_{false};
};

}  // namespace fefo
