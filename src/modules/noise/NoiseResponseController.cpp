#include "modules/noise/NoiseResponseController.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {

const char* noiseResponseStateName(NoiseResponseState state) {
  switch (state) {
    case NoiseResponseState::kIdle:
      return "AGUARDANDO";
    case NoiseResponseState::kQualifying:
      return "CONFIRMANDO_RUIDO";
    case NoiseResponseState::kMotorActive:
      return "MOTOR_ATIVO";
    case NoiseResponseState::kReleaseDelay:
      return "AGUARDANDO_SILENCIO";
    case NoiseResponseState::kSafetyLockout:
      return "BLOQUEIO_SEGURANCA";
  }
  return "DESCONHECIDO";
}

void NoiseResponseController::begin() {
  state_ = NoiseResponseState::kIdle;
  stateStartedAtMs_ = millis();
  aboveThreshold_ = false;
  Serial.printf(
      "[NOISE] Regra pronta: >%u%% (> %u/%u barras) por %lu ms; "
      "desliga apos %lu ms de silencio.\n",
      board::kNoiseTriggerPercent, board::kNoiseTriggerSegments,
      board::kVuSegmentCount,
      static_cast<unsigned long>(board::kNoiseQualificationMs),
      static_cast<unsigned long>(board::kNoiseReleaseMs));
}

void NoiseResponseController::update(uint8_t levelPercent, uint32_t nowMs,
                                     VibrationService& vibration) {
  // Mais de 16 das 20 barras significa 81% ou mais. O valor 80% ainda
  // corresponde exatamente a 16 barras e, portanto, não inicia a contagem.
  aboveThreshold_ = levelPercent > board::kNoiseTriggerPercent;

  // O módulo do motor aplica o limite físico de 10 segundos antes da regra de
  // negócio tomar qualquer outra decisão.
  vibration.update(nowMs);
  if (vibration.safetyLockout() &&
      state_ != NoiseResponseState::kSafetyLockout) {
    transitionTo(NoiseResponseState::kSafetyLockout, nowMs);
  }

  switch (state_) {
    case NoiseResponseState::kIdle:
      if (aboveThreshold_) {
        transitionTo(NoiseResponseState::kQualifying, nowMs);
      }
      break;

    case NoiseResponseState::kQualifying:
      if (!aboveThreshold_) {
        transitionTo(NoiseResponseState::kIdle, nowMs);
      } else if (nowMs - stateStartedAtMs_ >=
                 board::kNoiseQualificationMs) {
        if (vibration.start(board::kMotorActivationDuty)) {
          transitionTo(NoiseResponseState::kMotorActive, nowMs);
        }
      }
      break;

    case NoiseResponseState::kMotorActive:
      if (!vibration.active()) {
        transitionTo(vibration.safetyLockout()
                         ? NoiseResponseState::kSafetyLockout
                         : NoiseResponseState::kIdle,
                     nowMs);
      } else if (!aboveThreshold_) {
        transitionTo(NoiseResponseState::kReleaseDelay, nowMs);
      }
      break;

    case NoiseResponseState::kReleaseDelay:
      if (!vibration.active()) {
        transitionTo(vibration.safetyLockout()
                         ? NoiseResponseState::kSafetyLockout
                         : NoiseResponseState::kIdle,
                     nowMs);
      } else if (aboveThreshold_) {
        // Um novo ruído antes dos três segundos cancela o desligamento.
        transitionTo(NoiseResponseState::kMotorActive, nowMs);
      } else if (nowMs - stateStartedAtMs_ >= board::kNoiseReleaseMs) {
        vibration.stop();
        transitionTo(NoiseResponseState::kIdle, nowMs);
      }
      break;

    case NoiseResponseState::kSafetyLockout:
      if (aboveThreshold_) {
        // Exige três segundos contínuos abaixo do limite antes de rearmar.
        stateStartedAtMs_ = nowMs;
      } else if (nowMs - stateStartedAtMs_ >= board::kNoiseReleaseMs) {
        vibration.clearSafetyLockout();
        transitionTo(NoiseResponseState::kIdle, nowMs);
      }
      break;
  }
}

void NoiseResponseController::transitionTo(NoiseResponseState nextState,
                                           uint32_t nowMs) {
  if (state_ == nextState) return;
  Serial.printf("[NOISE] %s -> %s.\n", noiseResponseStateName(state_),
                noiseResponseStateName(nextState));
  state_ = nextState;
  stateStartedAtMs_ = nowMs;
}

}  // namespace fefo
