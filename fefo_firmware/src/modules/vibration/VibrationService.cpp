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
  pattern_ = 0;
  Serial.printf("[VIBRATION] Motor ligado: PWM %u/255, limite %lu ms.\n", duty,
                static_cast<unsigned long>(maxDurationMs_));
  return true;
}

bool VibrationService::startPattern(uint8_t pattern, uint32_t durationMs) {
  if (pattern < 1 || pattern > 11 || durationMs == 0) return false;
  const bool started = start(255, durationMs);
  if (started) pattern_ = pattern;
  return started;
}

void VibrationService::update(uint32_t nowMs) {
  if (!active_) return;
  const uint32_t elapsed = nowMs - startedAtMs_;
  if (elapsed < maxDurationMs_) {
    if (pattern_ != 0) {
      // Todos os desenhos ocupam exatamente sete segundos. A alternância é
      // feita no próprio PWM para o motor continuar forte, mas com ritmos
      // claramente diferentes.
      uint32_t cycle = 500;
      uint32_t on = 360;
      switch (pattern_) {
        case 1: cycle = 180; on = 140; break;
        case 2: cycle = 900; on = (elapsed % cycle < 260 ||
                                   (elapsed % cycle >= 420 && elapsed % cycle < 680)) ? 260 : 0; break;
        case 3: cycle = 1200; on = ((elapsed % cycle < 180) ||
                                    (elapsed % cycle >= 300 && elapsed % cycle < 480) ||
                                    (elapsed % cycle >= 600 && elapsed % cycle < 1080)) ? 255 : 0; break;
        case 4: cycle = 1400; on = 200 + ((elapsed % cycle) / 4); break;
        case 5: cycle = 1600; on = ((elapsed % cycle < 180) ||
                                    (elapsed % cycle >= 300 && elapsed % cycle < 480) ||
                                    (elapsed % cycle >= 600 && elapsed % cycle < 780)) ? 255 : 0; break;
        case 6: cycle = 1400; on = ((elapsed % cycle) < 700) ? 255 : 0; break;
        case 7: cycle = 700; on = ((elapsed % cycle) < 420) ? 255 : 0; break;
        case 8: cycle = 1800; on = static_cast<uint32_t>(120 + ((elapsed % cycle) * 600 / cycle)); break;
        case 9: cycle = 1000; on = ((elapsed % cycle < 180) ||
                                    (elapsed % cycle >= 360 && elapsed % cycle < 540) ||
                                    (elapsed % cycle >= 720 && elapsed % cycle < 900)) ? 255 : 0; break;
        case 10: cycle = 1100; on = ((elapsed % cycle) < 780) ? 255 : 0; break;
        case 11: cycle = 620; on = ((elapsed % cycle) < 390) ? 255 : 0; break;
      }
      const uint32_t phase = elapsed % cycle;
      writeOutput(phase < on ? 255 : 0);
    }
    return;
  }

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
