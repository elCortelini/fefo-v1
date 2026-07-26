#include "modules/leds/LedService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {

bool LedService::begin() {
  // Força o GPIO como saída antes de iniciar o periférico RMT da biblioteca.
  // Nenhum módulo de touch pode reconfigurar este pino nesta versão.
  pinMode(board::kNeoPixel, OUTPUT);
  digitalWrite(board::kNeoPixel, LOW);
  strip_.begin();
  strip_.setBrightness(board::kDefaultMaxLedBrightness);
  strip_.clear();
  strip_.show();
  Serial.printf("[LEDS] GPIO %d reservado; %u NeoPixels em brilho %u/255.\n",
                board::kNeoPixel, board::kNeoPixelCount,
                board::kDefaultMaxLedBrightness);
  return true;
}

void LedService::selfTest() {
  // Tempos longos tornam o teste inequívoco mesmo quando o usuário começa a
  // observar a placa alguns segundos depois do reset.
  Serial.println("[LEDS] GPIO 22: VERMELHO por 3 segundos.");
  showColor(255, 0, 0, 3000);
  Serial.println("[LEDS] GPIO 22: VERDE por 3 segundos.");
  showColor(0, 255, 0, 3000);
  Serial.println("[LEDS] GPIO 22: AZUL por 3 segundos.");
  showColor(0, 0, 255, 3000);
  Serial.println("[LEDS] GPIO 22: BRANCO fraco por 3 segundos.");
  showColor(80, 80, 80, 3000);
  stop();
  Serial.println("[LEDS] Autoteste concluido; fita desligada.");
}

void LedService::stop() {
  strip_.clear();
  strip_.show();
}

void LedService::showColor(uint8_t red, uint8_t green, uint8_t blue,
                           uint32_t durationMs) {
  strip_.fill(strip_.Color(red, green, blue));
  strip_.show();
  delay(durationMs);
}

}  // namespace fefo
