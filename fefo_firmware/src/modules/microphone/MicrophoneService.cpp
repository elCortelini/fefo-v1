#include "modules/microphone/MicrophoneService.h"

#include <Arduino.h>
#include <cmath>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

constexpr uint16_t kSamplesPerWindow = 128;
constexpr uint32_t kSamplePeriodUs = 125;  // 8 kHz, janela de 16 ms.

}  // namespace

bool MicrophoneService::begin() {
  pinMode(board::kMicrophone, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(board::kMicrophone, ADC_11db);
  delay(40);

  // A janela mais silenciosa evita calibrar uma fala como ruído permanente.
  uint16_t quietestRms = UINT16_MAX;
  uint32_t biasSum = 0;
  for (uint8_t window = 0; window < 8; ++window) {
    const MicrophoneReading reading = captureWindow();
    quietestRms = min(quietestRms, reading.rms);
    biasSum += reading.bias;
  }

  const uint16_t averageBias = biasSum / 8;
  noiseFloorRms_ = max<uint16_t>(6, quietestRms + quietestRms / 3 + 2);
  const bool biasValid = averageBias > 80 && averageBias < 4015;
  Serial.printf("[MIC] MAX9814 GPIO %d: bias=%u, piso RMS=%u, ADC1 %s.\n",
                board::kMicrophone, averageBias, noiseFloorRms_,
                biasValid ? "pronto" : "fora da faixa");
  return biasValid;
}

MicrophoneReading MicrophoneService::read() {
  MicrophoneReading reading = captureWindow();
  const float signalRms =
      max(0.0F, static_cast<float>(reading.rms) - noiseFloorRms_);

  // A escala logarítmica se aproxima da percepção humana de intensidade.
  const float normalized = min(1.0F, signalRms / 700.0F);
  const float perceptual = log10f(1.0F + 99.0F * normalized) / 2.0F;
  const float target = perceptual * 100.0F;
  const float coefficient = target > smoothedLevel_ ? 0.58F : 0.14F;
  smoothedLevel_ += (target - smoothedLevel_) * coefficient;

  reading.levelPercent =
      static_cast<uint8_t>(constrain(lroundf(smoothedLevel_), 0L, 100L));
  if (reading.levelPercent >= heldPeak_) {
    heldPeak_ = reading.levelPercent;
  } else if (heldPeak_ > 0) {
    --heldPeak_;
  }
  reading.peakPercent = heldPeak_;
  return reading;
}

MicrophoneReading MicrophoneService::captureWindow() {
  uint16_t samples[kSamplesPerWindow];
  uint16_t minimum = 4095;
  uint16_t maximum = 0;
  uint32_t sum = 0;
  uint32_t nextSampleAt = micros();

  for (uint16_t index = 0; index < kSamplesPerWindow; ++index) {
    const uint16_t sample = analogRead(board::kMicrophone);
    samples[index] = sample;
    minimum = min(minimum, sample);
    maximum = max(maximum, sample);
    sum += sample;

    nextSampleAt += kSamplePeriodUs;
    const int32_t remaining = static_cast<int32_t>(nextSampleAt - micros());
    if (remaining > 20) delayMicroseconds(remaining - 10);
    while (static_cast<int32_t>(nextSampleAt - micros()) > 0) {
    }
  }

  const uint16_t bias = sum / kSamplesPerWindow;
  uint64_t squaredSum = 0;
  for (uint16_t sample : samples) {
    const int32_t centered = static_cast<int32_t>(sample) - bias;
    squaredSum += static_cast<int64_t>(centered) * centered;
  }

  MicrophoneReading reading;
  reading.minimum = minimum;
  reading.maximum = maximum;
  reading.bias = bias;
  reading.rms = static_cast<uint16_t>(
      sqrtf(static_cast<float>(squaredSum) / kSamplesPerWindow));
  reading.peakToPeak = maximum - minimum;
  reading.clipping = minimum < 12 || maximum > 4083;
  return reading;
}

}  // namespace fefo
