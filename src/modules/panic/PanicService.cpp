#include "modules/panic/PanicService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {

bool PanicService::begin() {
  noiseResponse_.begin();
  Serial.printf(
      "[PANIC] Ativo: ruido >%u%% por %lu ms, vibracao + sirene, maximo %lu "
      "ms.\n",
      board::kNoiseTriggerPercent,
      static_cast<unsigned long>(board::kNoiseQualificationMs),
      static_cast<unsigned long>(board::kMotorMaxDurationMs));
  return true;
}

void PanicService::update(uint8_t levelPercent, uint32_t nowMs,
                          VibrationService& vibration, AudioService& audio) {
  // O detector decide quando o motor deve ligar ou parar e aplica tanto os
  // três segundos de liberação quanto o limite absoluto de dez segundos.
  noiseResponse_.update(levelPercent, nowMs, vibration);

  // O estado real do motor, já atualizado acima, é a única fonte de verdade do
  // áudio. Isso impede sirene sem vibração em cooldown, falha ou timeout.
  audio.setSirenActive(vibration.active());
}

}  // namespace fefo
