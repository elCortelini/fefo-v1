#include "LedPatternPlayer.h"

namespace fefo::led_test {
namespace {

// O valor máximo 64/255 mantém corrente e aquecimento baixos durante o loop
// infinito. A tela amplia visualmente as cores, mas preserva sua ordem.
constexpr uint8_t kMaximumChannel = 64;

constexpr PatternInfo kPatterns[kPatternCount] = {
    {"PISCA BRANCO", "Todos acendem e apagam juntos"},
    {"VERMELHO / AZUL", "Pares e impares trocam de cor"},
    {"CORRIDA VERDE", "Um ponto verde percorre os 15 LEDs"},
    {"EXPANSAO AMARELA", "A luz abre e fecha a partir do centro"},
    {"ARCO-IRIS", "Cores em movimento por toda a fita"},
};

RgbColor colorWheel(uint8_t position) {
  // Três rampas lineares formam vermelho -> verde -> azul -> vermelho.
  if (position < 85) {
    return {static_cast<uint8_t>(kMaximumChannel - position *
                                 kMaximumChannel / 84),
            static_cast<uint8_t>(position * kMaximumChannel / 84), 0};
  }
  if (position < 170) {
    position -= 85;
    return {0,
            static_cast<uint8_t>(kMaximumChannel - position *
                                 kMaximumChannel / 84),
            static_cast<uint8_t>(position * kMaximumChannel / 84)};
  }
  position -= 170;
  return {static_cast<uint8_t>(position * kMaximumChannel / 85), 0,
          static_cast<uint8_t>(kMaximumChannel - position *
                               kMaximumChannel / 85)};
}

}  // namespace

void LedPatternPlayer::begin(uint32_t nowMs) {
  patternIndex_ = 0;
  patternStartedAtMs_ = nowMs;
  renderedFrame_ = UINT32_MAX;
  completedLoops_ = 0;
  render(0);
  renderedFrame_ = 0;
}

bool LedPatternPlayer::update(uint32_t nowMs) {
  bool patternChanged = false;

  // O while preserva a cadência mesmo se uma atualização atrasar alguns ms.
  while (nowMs - patternStartedAtMs_ >= kPatternDurationMs) {
    patternStartedAtMs_ += kPatternDurationMs;
    patternIndex_ = (patternIndex_ + 1) % kPatternCount;
    if (patternIndex_ == 0) ++completedLoops_;
    renderedFrame_ = UINT32_MAX;
    patternChanged = true;
  }

  const uint32_t elapsedMs = nowMs - patternStartedAtMs_;
  const uint32_t frame = elapsedMs / kFrameIntervalMs;
  if (!patternChanged && frame == renderedFrame_) return false;

  render(elapsedMs);
  renderedFrame_ = frame;
  return true;
}

uint32_t LedPatternPlayer::patternElapsedMs(uint32_t nowMs) const {
  return min(nowMs - patternStartedAtMs_, kPatternDurationMs);
}

uint32_t LedPatternPlayer::patternRemainingMs(uint32_t nowMs) const {
  return kPatternDurationMs - patternElapsedMs(nowMs);
}

const PatternInfo& LedPatternPlayer::info() const {
  return kPatterns[patternIndex_];
}

void LedPatternPlayer::render(uint32_t elapsedMs) {
  clearPixels();

  switch (patternIndex_) {
    case 0: {
      // Quatro pulsos brancos completos durante os dois segundos.
      const bool on = (elapsedMs / 250) % 2 == 0;
      if (!on) break;
      for (auto& pixel : pixels_) {
        pixel = {48, 48, 48};
      }
      break;
    }

    case 1: {
      // A inversão periódica também revela qualquer LED fora de ordem.
      const bool swap = (elapsedMs / 250) % 2 != 0;
      for (size_t index = 0; index < kLedCount; ++index) {
        const bool red = (index % 2 == 0) ^ swap;
        pixels_[index] = red ? RgbColor{kMaximumChannel, 0, 0}
                             : RgbColor{0, 0, kMaximumChannel};
      }
      break;
    }

    case 2: {
      // Uma única passagem pelos 15 pontos identifica ordem e posição sem
      // repetir o começo da fita antes da troca de padrão.
      const size_t head = min<size_t>(
          kLedCount - 1, elapsedMs * kLedCount / kPatternDurationMs);
      pixels_[head] = {0, kMaximumChannel, 0};
      if (head >= 1) pixels_[head - 1] = {0, 24, 0};
      if (head >= 2) pixels_[head - 2] = {0, 8, 0};
      break;
    }

    case 3: {
      // No primeiro segundo cresce do LED central às pontas; no segundo fecha.
      const uint8_t step = (elapsedMs % 1000) / 125;
      const uint8_t radius = elapsedMs < 1000 ? step : 7 - step;
      for (size_t index = 0; index < kLedCount; ++index) {
        const uint8_t distance =
            index > 7 ? static_cast<uint8_t>(index - 7)
                      : static_cast<uint8_t>(7 - index);
        if (distance <= radius) pixels_[index] = {64, 48, 0};
      }
      break;
    }

    default: {
      // Cada LED recebe uma posição diferente da roda; o offset cria movimento.
      const uint8_t offset = static_cast<uint8_t>(elapsedMs / 8);
      for (size_t index = 0; index < kLedCount; ++index) {
        const uint8_t wheelPosition = static_cast<uint8_t>(
            index * 256 / kLedCount + offset);
        pixels_[index] = colorWheel(wheelPosition);
      }
      break;
    }
  }
}

void LedPatternPlayer::clearPixels() {
  for (auto& pixel : pixels_) pixel = {0, 0, 0};
}

}  // namespace fefo::led_test
