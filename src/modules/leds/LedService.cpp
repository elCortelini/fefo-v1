#include "modules/leds/LedService.h"

#include <Arduino.h>

#include <esp_attr.h>
#include <freertos/FreeRTOS.h>
#include <freertos/portmacro.h>
#include <soc/gpio_struct.h>
#include <xtensa/core-macros.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

// O ESP32 deste projeto roda a 240 MHz. Cada bit WS2812 dura cerca de 1,25 us
// (300 ciclos): 0 usa HIGH por 0,40 us; 1 usa HIGH por 0,80 us.
constexpr uint32_t kBitTotalCycles = 300;
constexpr uint32_t kZeroHighCycles = 96;
constexpr uint32_t kOneHighCycles = 192;
constexpr uint32_t kNeoPixelPinMask = 1UL << board::kNeoPixel;
constexpr size_t kFrameBytes = board::kNeoPixelCount * 3;
static_assert(F_CPU == 240000000L,
              "NeoPixel bit-bang exige CPU fixa em 240 MHz");
static_assert(board::kNeoPixel < 32,
              "Transporte direto atual suporta apenas GPIO abaixo de 32");

portMUX_TYPE bitBangMux = portMUX_INITIALIZER_UNLOCKED;
// Não pode ser const: o quadro precisa permanecer em DRAM, nunca em flash.
DRAM_ATTR uint8_t bitBangFrame[kFrameBytes];

static inline __attribute__((always_inline)) void waitFrom(
    uint32_t startedAt, uint32_t targetCycles) {
  while (static_cast<uint32_t>(XTHAL_GET_CCOUNT() - startedAt) <
         targetCycles) {
    __asm__ __volatile__("nop");
  }
}

void IRAM_ATTR writeBitBangFrame(const uint8_t* data, size_t length) {
  // O spinlock impede preempção local durante apenas ~450 us. O PWM do motor
  // continua em hardware e o outro núcleo permanece livre para o BLE.
  portENTER_CRITICAL(&bitBangMux);
  for (size_t byteIndex = 0; byteIndex < length; ++byteIndex) {
    const uint8_t value = data[byteIndex];
    for (uint8_t mask = 0x80; mask != 0; mask >>= 1) {
      const uint32_t bitStartedAt = XTHAL_GET_CCOUNT();
      GPIO.out_w1ts = kNeoPixelPinMask;
      waitFrom(bitStartedAt,
               value & mask ? kOneHighCycles : kZeroHighCycles);
      GPIO.out_w1tc = kNeoPixelPinMask;
      waitFrom(bitStartedAt, kBitTotalCycles);
    }
  }
  GPIO.out_w1tc = kNeoPixelPinMask;
  portEXIT_CRITICAL(&bitBangMux);

  // Mantém o sinal baixo muito além do latch mínimo antes de retornar ao VU.
  delayMicroseconds(300);
}

void sendBitBangFrame(uint8_t red, uint8_t green, uint8_t blue) {
  for (uint16_t pixel = 0; pixel < board::kNeoPixelCount; ++pixel) {
    // A fita usada pelo FEFO 190 recebe bytes na ordem GRB.
    bitBangFrame[pixel * 3] = green;
    bitBangFrame[pixel * 3 + 1] = red;
    bitBangFrame[pixel * 3 + 2] = blue;
  }
  writeBitBangFrame(bitBangFrame, sizeof(bitBangFrame));
}

}  // namespace

bool LedService::begin() {
  // Força o GPIO como saída antes de iniciar o periférico RMT da biblioteca.
  // Nenhum módulo de touch pode reconfigurar este pino nesta versão.
  pinMode(board::kNeoPixel, OUTPUT);
  digitalWrite(board::kNeoPixel, LOW);
  delayMicroseconds(300);
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

bool LedService::startBitBangDiagnostic() {
  if (!board::kNeoPixelBitBangDiagnosticEnabled) return false;
  if (getCpuFrequencyMhz() != 240) {
    Serial.printf("[LEDS-BITBANG] Cancelado: CPU em %u MHz, esperado 240.\n",
                  getCpuFrequencyMhz());
    return false;
  }

  // O último show() Adafruit já terminou e liberou o canal RMT no core 2.
  // A partir daqui somente este diagnóstico escreve no GPIO 22.
  pinMode(board::kNeoPixel, OUTPUT);
  digitalWrite(board::kNeoPixel, LOW);
  bitBangDiagnosticActive_ = true;
  bitBangDiagnosticPhase_ = 0;
  bitBangDiagnosticChangedAtMs_ = millis();
  Serial.println(
      "[LEDS-BITBANG] Teste sem RMT iniciado: vermelho/verde/azul/branco/off.");
  showBitBangDiagnosticPhase();
  return true;
}

void LedService::updateBitBangDiagnostic(uint32_t nowMs) {
  if (!bitBangDiagnosticActive_ ||
      nowMs - bitBangDiagnosticChangedAtMs_ <
          board::kNeoPixelDiagnosticStepMs) {
    return;
  }

  bitBangDiagnosticChangedAtMs_ = nowMs;
  bitBangDiagnosticPhase_ = (bitBangDiagnosticPhase_ + 1) % 5;
  showBitBangDiagnosticPhase();
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

void LedService::showBitBangDiagnosticPhase() {
  switch (bitBangDiagnosticPhase_) {
    case 0:
      Serial.println("[LEDS-BITBANG] VERMELHO por 3 segundos.");
      sendBitBangFrame(64, 0, 0);
      break;
    case 1:
      Serial.println("[LEDS-BITBANG] VERDE por 3 segundos.");
      sendBitBangFrame(0, 64, 0);
      break;
    case 2:
      Serial.println("[LEDS-BITBANG] AZUL por 3 segundos.");
      sendBitBangFrame(0, 0, 64);
      break;
    case 3:
      Serial.println("[LEDS-BITBANG] BRANCO por 3 segundos.");
      sendBitBangFrame(48, 48, 48);
      break;
    default:
      Serial.println("[LEDS-BITBANG] APAGADO por 3 segundos.");
      sendBitBangFrame(0, 0, 0);
      break;
  }
}

}  // namespace fefo
