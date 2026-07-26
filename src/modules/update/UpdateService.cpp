#include "modules/update/UpdateService.h"

#include <Arduino.h>

namespace fefo {

bool UpdateService::begin() {
  Serial.println("[UPDATE] Particoes OTA prontas; transporte BLE ainda bloqueado.");
  return true;
}

}  // namespace fefo

