#include "modules/vibration/VibrationService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

constexpr uint8_t kSelfTestDuty = 150;

}  // namespace

bool VibrationService::begin() {
  // Arduino-ESP32 2.x usa canal LEDC explícito. Esta configuração equivale ao
  // ledcAttach(GPIO, 5000, 8) empregado pelo FEFO 190 no core 3.x.
  ledcSetup(board::kMotorPwmChannel, board::kMotorPwmFrequencyHz,
            board::kMotorPwmResolutionBits);
  ledcAttachPin(board::kMotor, board::kMotorPwmChannel);
  writeOutput(0);
  initialized_ = true;
  active_ = false;
  safetyLockout_ = false;
  // Permite o primeiro acionamento imediatamente depois do boot.
  stoppedAtMs_ = millis() - board::kMotorCooldownMs;
  Serial.printf("[VIBRATION] GPIO %d reservado; PWM %lu Hz/8 bits pronto.\n",
                board::kMotor,
                static_cast<unsigned long>(board::kMotorPwmFrequencyHz));
  return true;
}

void VibrationService::selfTest() {
  Serial.println("[VIBRATION] Autoteste GPIO 21: dois pulsos PWM 150/255.");
  for (uint8_t pulse = 0; pulse < 2; ++pulse) {
    writeOutput(kSelfTestDuty);
    delay(400);
    writeOutput(0);
    delay(300);
  }
  active_ = false;
  stoppedAtMs_ = millis();
  Serial.println("[VIBRATION] Autoteste concluido; motor desligado.");
}

bool VibrationService::start(uint8_t duty, uint32_t maxDurationMs) {
  if (!initialized_ || safetyLockout_ || maxDurationMs == 0) return false;
  // Não informa sucesso para uma segunda solicitação que seria ignorada. Isso
  // evita que outro módulo suponha ter substituído o prazo já em andamento.
  if (active_) return false;

  const uint32_t nowMs = millis();
  if (nowMs - stoppedAtMs_ < board::kMotorCooldownMs) return false;

  duty = constrain(duty, static_cast<uint8_t>(1),
                   static_cast<uint8_t>(255));
  if (maxDurationMs > board::kMotorAbsoluteMaxDurationMs) {
    Serial.printf(
        "[VIBRATION] Prazo solicitado (%lu ms) limitado ao teto fisico de "
        "%lu ms.\n",
        static_cast<unsigned long>(maxDurationMs),
        static_cast<unsigned long>(board::kMotorAbsoluteMaxDurationMs));
    maxDurationMs = board::kMotorAbsoluteMaxDurationMs;
  }
  writeOutput(duty);
  active_ = true;
  startedAtMs_ = nowMs;
  maxDurationMs_ = maxDurationMs;
  Serial.printf("[VIBRATION] Motor ligado: PWM %u/255, limite %lu ms.\n", duty,
                static_cast<unsigned long>(maxDurationMs_));
  return true;
}

void VibrationService::update(uint32_t nowMs) {
  if (!active_ || nowMs - startedAtMs_ < maxDurationMs_) return;

  writeOutput(0);
  active_ = false;
  safetyLockout_ = true;
  stoppedAtMs_ = nowMs;
  Serial.printf("[VIBRATION] Limite de seguranca de %lu ms atingido.\n",
                static_cast<unsigned long>(maxDurationMs_));
}

void VibrationService::stop() {
  if (!initialized_) return;
  writeOutput(0);
  if (!active_) return;

  active_ = false;
  stoppedAtMs_ = millis();
  Serial.println("[VIBRATION] Motor desligado.");
}

void VibrationService::clearSafetyLockout() {
  if (!safetyLockout_) return;
  safetyLockout_ = false;
  Serial.println("[VIBRATION] Bloqueio de seguranca liberado.");
}

void VibrationService::writeOutput(uint8_t duty) {
  ledcWrite(board::kMotorPwmChannel, duty);
}

}  // namespace fefo
