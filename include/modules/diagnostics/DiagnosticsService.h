#pragma once

#include "core/SystemState.h"

namespace fefo {

// Produz um inventário técnico sem armazenar dados pessoais ou áudio.
class DiagnosticsService {
 public:
  void printBootReport(SystemState state, bool storageAvailable) const;
};

}  // namespace fefo

