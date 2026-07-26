#include "modules/panic/PanicService.h"

#include <Arduino.h>

namespace fefo {

bool PanicService::begin() {
  Serial.println("[PANIC] Modulo isolado e desabilitado por configuracao.");
  return true;
}

}  // namespace fefo

