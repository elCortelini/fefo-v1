#include "core/SystemState.h"

namespace fefo {

const char* systemStateName(SystemState state) {
  switch (state) {
    case SystemState::kBoot: return "BOOT";
    case SystemState::kSelfTest: return "SELF_TEST";
    case SystemState::kReady: return "READY";
    case SystemState::kDegraded: return "DEGRADED";
    case SystemState::kActivity: return "ACTIVITY";
    case SystemState::kRegulation: return "REGULATION";
    case SystemState::kTransfer: return "TRANSFER";
    case SystemState::kMaintenance: return "MAINTENANCE";
    case SystemState::kFault: return "FAULT";
    case SystemState::kSafeMode: return "SAFE_MODE";
  }
  return "UNKNOWN";
}

}  // namespace fefo

