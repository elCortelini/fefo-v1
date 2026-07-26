#pragma once

#include "core/SystemState.h"
#include "modules/audio/AudioService.h"
#include "modules/ble/BleService.h"
#include "modules/diagnostics/DiagnosticsService.h"
#include "modules/display/DisplayService.h"
#include "modules/leds/LedService.h"
#include "modules/microphone/MicrophoneService.h"
#include "modules/panic/PanicService.h"
#include "modules/storage/StorageService.h"
#include "modules/update/UpdateService.h"
#include "modules/vibration/VibrationService.h"

namespace fefo {

// Ponto único de composição e coordenação dos serviços do firmware.
class AppController {
 public:
  void begin();
  void update();

 private:
  void transitionTo(SystemState nextState);

  SystemState state_{SystemState::kBoot};
  AudioService audio_;
  BleService ble_;
  DiagnosticsService diagnostics_;
  DisplayService display_;
  LedService leds_;
  MicrophoneService microphone_;
  PanicService panic_;
  StorageService storage_;
  UpdateService update_;
  VibrationService vibration_;
  bool microphoneReady_{false};
  uint32_t lastMicrophoneUpdateMs_{0};
  uint32_t lastMicrophoneLogMs_{0};
};

}  // namespace fefo
