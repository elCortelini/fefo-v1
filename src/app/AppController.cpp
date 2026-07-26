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
}

void AppController::update() {
  if (microphoneReady_ && millis() - lastMicrophoneUpdateMs_ >= 40) {
    lastMicrophoneUpdateMs_ = millis();
    const MicrophoneReading reading = microphone_.read();
    display_.showVuMeter(reading.levelPercent, reading.peakPercent, reading.rms,
                         reading.bias, reading.peakToPeak, reading.clipping);

    if (millis() - lastMicrophoneLogMs_ >= 1000) {
      lastMicrophoneLogMs_ = millis();
      Serial.printf("[MIC] nivel=%u%% pico=%u%% rms=%u p-p=%u bias=%u%s\n",
                    reading.levelPercent, reading.peakPercent, reading.rms,
                    reading.peakToPeak, reading.bias,
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
