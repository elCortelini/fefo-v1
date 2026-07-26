#include "modules/vibration/VibrationService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {

bool VibrationService::begin() {
  // Arduino-ESP32 2.x usa canal LEDC explícito. Esta configuração equivale ao
  // ledcAttach(GPIO, 5000, 8) empregado pelo FEFO 190 no core 3.x.
  ledcSetup(board::kMotorPwmChannel, board::kMotorPwmFrequencyHz,
            board::kMotorPwmResolutionBits);
  ledcAttachPin(board::kMotor, board::kMotorPwmChannel);
  ledcWrite(board::kMotorPwmChannel, 0);
  Serial.printf("[VIBRATION] GPIO %d reservado; PWM %lu Hz/8 bits pronto.\n",
                board::kMotor,
                static_cast<unsigned long>(board::kMotorPwmFrequencyHz));
  return true;
}

void VibrationService::selfTest() {
  Serial.println("[VIBRATION] Autoteste GPIO 21: dois pulsos PWM 150/255.");
  for (uint8_t pulse = 0; pulse < 2; ++pulse) {
    ledcWrite(board::kMotorPwmChannel, 150);
    delay(400);
    ledcWrite(board::kMotorPwmChannel, 0);
    delay(300);
  }
  stop();
  Serial.println("[VIBRATION] Autoteste concluido; motor desligado.");
}

void VibrationService::stop() {
  ledcWrite(board::kMotorPwmChannel, 0);
}

}  // namespace fefo
