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
  // Mais de 16 das 20 barras significa 81% ou mais. Exatamente 80% ainda não
  // inicia a contagem, conforme a definição validada na V0.0.2.
  aboveThreshold_ = levelPercent > panic::kTriggerPercent;

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
  audio.setSirenActive(vibration.active());
}

void PanicService::transitionTo(PanicState nextState, uint32_t nowMs) {
  if (state_ == nextState) return;
  Serial.printf("[PANIC] %s -> %s.\n", panicStateName(state_),
                panicStateName(nextState));
  state_ = nextState;
  stateStartedAtMs_ = nowMs;
}

}  // namespace fefo
