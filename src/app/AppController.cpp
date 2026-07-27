#include "app/AppController.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {

void AppController::begin() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n[APP] Iniciando FEFO %s.\n", board::kFirmwareVersion);

  transitionTo(SystemState::kSelfTest);

  // Atuadores são colocados em repouso antes de iniciar sensores e serviços.
  vibration_.begin();
  leds_.begin();
  audio_.begin();
  vibration_.stop();
  leds_.stop();
  audio_.stop();

  display_.begin();
  microphoneReady_ = microphone_.begin();
  panic_.begin();
  update_.begin();
  const bool storageReady = storage_.begin();
  const bool bleReady = ble_.begin();

  transitionTo(storageReady && bleReady && microphoneReady_
                   ? SystemState::kReady
                   : SystemState::kDegraded);
  display_.showSystemState(state_, storageReady);
  diagnostics_.printBootReport(state_, storageReady);
  display_.beginVuMeter(microphoneReady_, microphone_.noiseFloorRms());
  leds_.startBitBangDiagnostic();
}

void AppController::update() {
  bool microphoneSampled = false;
  MicrophoneReading reading;
  uint32_t nowMs = millis();

  if (microphoneReady_ && nowMs - lastMicrophoneUpdateMs_ >= 40) {
    lastMicrophoneUpdateMs_ = nowMs;
    reading = microphone_.read();
    latestMicrophoneLevelPercent_ = reading.levelPercent;
    microphoneSampled = true;
  }

  // A regra é atualizada em todo loop para que os prazos não dependam da taxa
  // de desenho da tela. Se o microfone falhar, o nível seguro é sempre zero.
  nowMs = millis();
  // O modo pânico apenas coordena módulos independentes. Ele recebe o nível do
  // MAX9814 e comanda os serviços de vibração e áudio sem conhecer seus GPIOs.
  panic_.update(microphoneReady_ ? latestMicrophoneLevelPercent_ : 0, nowMs,
                vibration_, audio_);

  const bool motorActive = vibration_.active();
  leds_.updateBitBangDiagnostic(nowMs);

  if (microphoneSampled) {
    display_.showVuMeter(reading.levelPercent, reading.peakPercent, reading.rms,
                         reading.bias, reading.peakToPeak, reading.clipping,
                         motorActive);

    if (nowMs - lastMicrophoneLogMs_ >= 1000) {
      lastMicrophoneLogMs_ = nowMs;
      const uint8_t activeSegments = static_cast<uint8_t>(
          (reading.levelPercent * board::kVuSegmentCount + 99) / 100);
      const char* sirenState = audio_.sirenActive()
                                    ? "ON"
                                    : (audio_.sirenAudible() ? "FADE" : "OFF");
      Serial.printf(
          "[MIC] nivel=%u%% barras=%u/%u pico=%u%% rms=%u p-p=%u bias=%u "
          "panico=%s motor=%s sirene=%s%s\n",
          reading.levelPercent, activeSegments, board::kVuSegmentCount,
          reading.peakPercent, reading.rms, reading.peakToPeak, reading.bias,
          noiseResponseStateName(panic_.state()),
          motorActive ? "ON" : "OFF", sirenState,
          reading.clipping ? " SATURADO" : "");
    }
  }
  delay(5);
}

void AppController::transitionTo(SystemState nextState) {
  if (state_ == nextState) return;
  Serial.printf("[STATE] %s -> %s\n", systemStateName(state_),
                systemStateName(nextState));
  state_ = nextState;
  ble_.publishState(state_);
}

}  // namespace fefo
