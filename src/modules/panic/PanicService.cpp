#include "modules/panic/PanicService.h"

#include <Arduino.h>

#include "modules/panic/PanicConfig.h"

namespace fefo {

static_assert(panic::kMaxActiveMs <= board::kMotorAbsoluteMaxDurationMs,
              "O modo panico excede o teto fisico do motor");

const char* panicStateName(PanicState state) {
  switch (state) {
    case PanicState::kIdle:
      return "AGUARDANDO";
    case PanicState::kQualifying:
      return "CONFIRMANDO_RUIDO";
    case PanicState::kActive:
      return "ATIVO";
    case PanicState::kReleaseDelay:
      return "AGUARDANDO_SILENCIO";
    case PanicState::kSafetyLockout:
      return "BLOQUEIO_SEGURANCA";
  }
  return "DESCONHECIDO";
}

bool PanicService::begin() {
  state_ = PanicState::kIdle;
  stateStartedAtMs_ = millis();
  aboveThreshold_ = false;
  enabled_ = true;
  manualTrigger_ = false;
  triggerPercent_ = panic::kTriggerPercent;
  idleDelayMs_ = board::kMicrophoneIdleEnableMs;

  Serial.printf(
      "[PANIC] Ativo: >%u%% (> %u/%u barras) por %lu ms; motor %u/255; "
      "maximo %lu ms.\n",
      panic::kTriggerPercent, panic::kTriggerSegments,
      panic::kVuSegmentCount,
      static_cast<unsigned long>(panic::kQualificationMs), panic::kMotorDuty,
      static_cast<unsigned long>(panic::kMaxActiveMs));
  Serial.printf("[PANIC] Audio futuro reservado: %s.\n",
                panic::kFutureAudioPath);
  return true;
}

void PanicService::update(uint8_t levelPercent, uint32_t nowMs,
                          VibrationService& vibration, AudioService& audio) {
  if (!enabled_) {
    aboveThreshold_ = false;
    vibration.update(nowMs);
    if (vibration.active()) vibration.stop();
    audio.setSirenActive(false);
    if (state_ != PanicState::kIdle) transitionTo(PanicState::kIdle, nowMs);
    return;
  }

  // Mais de 16 das 20 barras significa 81% ou mais. Exatamente 80% ainda não
  // inicia a contagem, conforme a definição validada na V0.0.2.
  aboveThreshold_ = manualTrigger_ || levelPercent > triggerPercent_;

  // O serviço genérico do motor aplica o prazo solicitado por este módulo.
  vibration.update(nowMs);
  if (vibration.safetyLockout() && state_ != PanicState::kSafetyLockout) {
    transitionTo(PanicState::kSafetyLockout, nowMs);
  }

  switch (state_) {
    case PanicState::kIdle:
      if (aboveThreshold_) transitionTo(PanicState::kQualifying, nowMs);
      break;

    case PanicState::kQualifying:
      if (!aboveThreshold_) {
        transitionTo(PanicState::kIdle, nowMs);
      } else if (nowMs - stateStartedAtMs_ >= panic::kQualificationMs) {
        if (vibration.start(panic::kMotorDuty, panic::kMaxActiveMs)) {
          transitionTo(PanicState::kActive, nowMs);
        }
      }
      break;

    case PanicState::kActive:
      if (!vibration.active()) {
        manualTrigger_ = false;
        transitionTo(vibration.safetyLockout()
                         ? PanicState::kSafetyLockout
                         : PanicState::kIdle,
                     nowMs);
      } else if (!aboveThreshold_) {
        transitionTo(PanicState::kReleaseDelay, nowMs);
      }
      break;

    case PanicState::kReleaseDelay:
      if (!vibration.active()) {
        transitionTo(vibration.safetyLockout()
                         ? PanicState::kSafetyLockout
                         : PanicState::kIdle,
                     nowMs);
      } else if (aboveThreshold_) {
        // Um novo ruído dentro dos três segundos cancela a liberação.
        transitionTo(PanicState::kActive, nowMs);
      } else if (nowMs - stateStartedAtMs_ >= panic::kReleaseMs) {
        vibration.stop();
        transitionTo(PanicState::kIdle, nowMs);
      }
      break;

    case PanicState::kSafetyLockout:
      if (aboveThreshold_) {
        // Qualquer novo ruído reinicia a exigência de silêncio para o rearme.
        stateStartedAtMs_ = nowMs;
      } else if (nowMs - stateStartedAtMs_ >= panic::kReleaseMs) {
        vibration.clearSafetyLockout();
        transitionTo(PanicState::kIdle, nowMs);
      }
      break;
  }

  // A saída real do motor é a fonte de verdade: falha, cooldown ou timeout
  // nunca podem deixar o áudio ligado sozinho.
  if (board::kAudioEnabled) {
    audio.setSirenActive(vibration.active());
  } else {
    audio.setSirenActive(false);
  }
}

void PanicService::transitionTo(PanicState nextState, uint32_t nowMs) {
  if (state_ == nextState) return;
  Serial.printf("[PANIC] %s -> %s.\n", panicStateName(state_),
                panicStateName(nextState));
  state_ = nextState;
  stateStartedAtMs_ = nowMs;
}

void PanicService::setEnabled(bool enabled) {
  enabled_ = enabled;
  if (!enabled_) {
    manualTrigger_ = false;
    aboveThreshold_ = false;
    transitionTo(PanicState::kIdle, millis());
  }
  Serial.printf("[PANIC] %s.\n", enabled_ ? "Habilitado" : "Desabilitado");
}

bool PanicService::triggerManual(uint32_t nowMs, VibrationService& vibration,
                                 AudioService& audio) {
  setEnabled(true);
  manualTrigger_ = true;
  aboveThreshold_ = true;
  if (!vibration.start(panic::kMotorDuty, panic::kMaxActiveMs)) {
    manualTrigger_ = false;
    return false;
  }
  audio.setSirenLocked(false);
  audio.setSirenActive(true);
  transitionTo(PanicState::kActive, nowMs);
  return true;
}

void PanicService::setTriggerPercent(uint8_t percent) {
  if (percent > 100) percent = 100;
  triggerPercent_ = percent;
  Serial.printf("[PANIC] Limiar ajustado para >%u%%.\n", triggerPercent_);
}

}  // namespace fefo
