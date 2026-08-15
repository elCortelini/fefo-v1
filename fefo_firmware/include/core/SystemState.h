#pragma once

#include <Arduino.h>

namespace fefo {

// Estados globais possíveis. As transições serão coordenadas somente pelo
// AppController para evitar flags globais contraditórias entre os módulos.
enum class SystemState : uint8_t {
  kBoot,
  kSelfTest,
  kReady,
  kDegraded,
  kActivity,
  kRegulation,
  kTransfer,
  kMaintenance,
  kFault,
  kSafeMode,
};

const char* systemStateName(SystemState state);

}  // namespace fefo

