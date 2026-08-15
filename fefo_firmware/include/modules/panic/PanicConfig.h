#pragma once

#include <cstdint>

#include "board/Fefo35Board.h"

namespace fefo::panic {

// Todas as regras ajustáveis do modo pânico ficam neste único arquivo. Assim,
// limiar, tempos, força do motor e futuro áudio podem mudar sem tocar nos
// drivers de microfone, vibração ou som.
inline constexpr uint8_t kTriggerSegments = 16;
inline constexpr uint8_t kVuSegmentCount = board::kVuSegmentCount;
inline constexpr uint8_t kTriggerPercent =
    kTriggerSegments * 100 / kVuSegmentCount;

// O nível precisa permanecer estritamente acima de 80% durante dois segundos.
inline constexpr uint32_t kQualificationMs = 2000;

// Depois que o ruído cai, motor e áudio ainda permanecem por três segundos.
inline constexpr uint32_t kReleaseMs = 3000;

// Limite absoluto contado a partir do acionamento efetivo de motor e áudio.
inline constexpr uint32_t kMaxActiveMs = 10000;
inline constexpr uint8_t kMotorDuty = 150;

// Reserva contratual para substituir a sirene sintetizada por áudio do cartão.
inline constexpr char kFutureAudioPath[] = "/sys/a/panic.wav";

}  // namespace fefo::panic
