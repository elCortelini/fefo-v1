#pragma once

#include <cstdint>

#include "modules/audio/AudioService.h"
#include "modules/vibration/VibrationService.h"

namespace fefo {

// Estados públicos do modo pânico. Eles permitem que tela, BLE e diagnóstico
// observem a rotina sem conhecer seus temporizadores internos.
enum class PanicState : uint8_t {
  kIdle,
  kQualifying,
  kActive,
  kReleaseDelay,
  kSafetyLockout,
};

// Módulo completo do modo pânico. Ele contém apenas a política: recebe o nível
// já calculado pelo MAX9814 e coordena serviços independentes de motor e áudio.
class PanicService {
 public:
  bool begin();
  void update(uint8_t levelPercent, uint32_t nowMs,
              VibrationService& vibration, AudioService& audio);
  bool triggerManual(uint32_t nowMs, VibrationService& vibration,
                     AudioService& audio);

  bool enabled() const { return enabled_; }
  void setEnabled(bool enabled);
  void setTriggerPercent(uint8_t percent);
  void setIdleDelayMs(uint32_t idleDelayMs) { idleDelayMs_ = idleDelayMs; }
  uint8_t triggerPercent() const { return triggerPercent_; }
  uint32_t idleDelayMs() const { return idleDelayMs_; }
  bool active() const {
    return state_ == PanicState::kActive ||
           state_ == PanicState::kReleaseDelay;
  }
  bool aboveThreshold() const { return aboveThreshold_; }
  PanicState state() const { return state_; }

 private:
  void transitionTo(PanicState nextState, uint32_t nowMs);

  PanicState state_{PanicState::kIdle};
  uint32_t stateStartedAtMs_{0};
  bool aboveThreshold_{false};
  bool enabled_{true};
  bool manualTrigger_{false};
  uint8_t triggerPercent_{0};
  uint32_t idleDelayMs_{0};
};

const char* panicStateName(PanicState state);

}  // namespace fefo
