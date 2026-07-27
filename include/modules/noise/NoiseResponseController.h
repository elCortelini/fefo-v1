#pragma once

#include <cstdint>

#include "modules/vibration/VibrationService.h"

namespace fefo {

// Estados observáveis da regra que transforma ruído sustentado em vibração.
// A máquina usa millis(), sem delays, para o microfone e a tela continuarem
// respondendo enquanto os temporizadores estão em andamento.
enum class NoiseResponseState : uint8_t {
  kIdle,
  kQualifying,
  kMotorActive,
  kReleaseDelay,
  kSafetyLockout,
};

class NoiseResponseController {
 public:
  void begin();
  void update(uint8_t levelPercent, uint32_t nowMs,
              VibrationService& vibration);
  NoiseResponseState state() const { return state_; }
  bool aboveThreshold() const { return aboveThreshold_; }

 private:
  void transitionTo(NoiseResponseState nextState, uint32_t nowMs);

  NoiseResponseState state_{NoiseResponseState::kIdle};
  uint32_t stateStartedAtMs_{0};
  bool aboveThreshold_{false};
};

const char* noiseResponseStateName(NoiseResponseState state);

}  // namespace fefo
