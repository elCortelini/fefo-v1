#include "modules/leds/LedService.h"

#include <Arduino.h>
#include <cmath>

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

void sendBitBangFrame(uint8_t red, uint8_t green, uint8_t blue,
                      uint8_t pixelCount) {
  for (uint16_t pixel = 0; pixel < pixelCount; ++pixel) {
    // A fita usada pelo FEFO 190 recebe bytes na ordem GRB.
    bitBangFrame[pixel * 3] = green;
    bitBangFrame[pixel * 3 + 1] = red;
    bitBangFrame[pixel * 3 + 2] = blue;
  }
  writeBitBangFrame(bitBangFrame, static_cast<size_t>(pixelCount) * 3);
}

}  // namespace

bool LedService::begin() {
  // Força o GPIO como saída antes de iniciar o periférico RMT da biblioteca.
  // Nenhum módulo de touch pode reconfigurar este pino nesta versão.
  pinMode(board::kNeoPixel, OUTPUT);
  digitalWrite(board::kNeoPixel, LOW);
  delayMicroseconds(300);
  strip_.begin();
  pixelCount_ = board::kNeoPixelCount;
  strip_.updateLength(pixelCount_);
  brightnessPercent_ = (board::kDefaultMaxLedBrightness * 100 + 127) / 255;
  strip_.setBrightness(board::kDefaultMaxLedBrightness);
  strip_.clear();
  strip_.show();
  panicActive_ = false;
  ledPhase_ = 0;
  lastLedUpdateMs_ = millis();
  Serial.printf("[LEDS] GPIO %d reservado; %u NeoPixels em brilho %u/255.\n",
                board::kNeoPixel, pixelCount_,
                board::kDefaultMaxLedBrightness);
  return true;
}

namespace {

uint32_t wheelColor(uint8_t position) {
  if (position < 85) {
    return ((uint32_t)position * 3 << 16) |
           ((uint32_t)(255 - position * 3) << 8) | 0;
  }
  if (position < 170) {
    position -= 85;
    return ((uint32_t)(255 - position * 3) << 16) | 0 |
           ((uint32_t)(position * 3));
  }
  position -= 170;
  return 0 | ((uint32_t)(position * 3) << 8) |
         ((uint32_t)(255 - position * 3));
}

uint32_t scaleColor(uint32_t color, uint8_t scale) {
  const uint8_t red = static_cast<uint8_t>((color >> 16) & 0xFF);
  const uint8_t green = static_cast<uint8_t>((color >> 8) & 0xFF);
  const uint8_t blue = static_cast<uint8_t>(color & 0xFF);
  return (static_cast<uint32_t>((red * scale) / 255) << 16) |
         (static_cast<uint32_t>((green * scale) / 255) << 8) |
         static_cast<uint32_t>((blue * scale) / 255);
}

}  // namespace

void LedService::update(uint32_t nowMs, bool panicActive, bool audioActive,
                        uint8_t audioLevelPercent) {
  if (bitBangDiagnosticActive_) {
    updateBitBangDiagnostic(nowMs);
    return;
  }

  const uint32_t intervalMs = audioActive ? 45u : (panicActive ? 120u : 140u);
  if (nowMs - lastLedUpdateMs_ < intervalMs) return;
  lastLedUpdateMs_ = nowMs;

  if (audioActive) {
    panicActive_ = false;
    showAudioVu(audioLevelPercent);
  } else if (panicActive) {
    if (!panicActive_) {
      ledPhase_ = 0;
    }
    panicActive_ = true;

    switch (ledPhase_ % 4) {
      case 0:
        strip_.fill(strip_.Color(255, 0, 0));
        break;
      case 1:
        strip_.fill(strip_.Color(0, 0, 0));
        break;
      case 2:
        for (uint16_t pixel = 0; pixel < board::kNeoPixelCount; ++pixel) {
          const bool even = (pixel % 2) == 0;
          strip_.setPixelColor(pixel,
                               strip_.Color(even ? 255 : 120,
                                            even ? 0 : 0,
                                            even ? 0 : 0));
        }
        break;
      default:
        for (uint16_t pixel = 0; pixel < board::kNeoPixelCount; ++pixel) {
          const uint8_t hue = static_cast<uint8_t>(
              (pixel * 255 / board::kNeoPixelCount + ledPhase_ * 8) & 0xFF);
          const uint32_t color = wheelColor(hue);
          strip_.setPixelColor(pixel, color);
        }
        break;
    }
  } else {
    panicActive_ = false;
    if (selectedPattern_ > 0) {
      showSelectedPattern(nowMs);
    } else {
      showCalm(nowMs);
    }
  }

  strip_.show();
  ++ledPhase_;
}

void LedService::setBrightnessPercent(uint8_t percent) {
  if (percent > 100) percent = 100;
  brightnessPercent_ = percent;
  const uint8_t brightness =
      static_cast<uint8_t>((static_cast<uint16_t>(percent) * 255 + 50) / 100);
  strip_.setBrightness(brightness);
  strip_.show();
  Serial.printf("[LEDS] Brilho ajustado para %u%%.\n", brightnessPercent_);
}

bool LedService::setPattern(uint8_t pattern) {
  if (pattern > 10) return false;
  selectedPattern_ = pattern;
  ledPhase_ = 0;
  lastLedUpdateMs_ = 0;
  Serial.printf("[LEDS] Padrao selecionado: LED %u.\n", selectedPattern_);
  return true;
}

bool LedService::setPixelCount(uint8_t count) {
  if (count != 15 && count != 20 && count != 25 && count != 30 && count != 35) {
    return false;
  }
  pixelCount_ = count;
  strip_.updateLength(pixelCount_);
  strip_.clear();
  strip_.show();
  ledPhase_ = 0;
  Serial.printf("[LEDS] Quantidade configurada: %u LEDs.\n", pixelCount_);
  return true;
}

void LedService::showAudioVu(uint8_t levelPercent) {
  const uint8_t activePixels = static_cast<uint8_t>(
      constrain((levelPercent * board::kNeoPixelCount + 99) / 100, 1,
                static_cast<int>(board::kNeoPixelCount)));
  for (uint16_t pixel = 0; pixel < board::kNeoPixelCount; ++pixel) {
    if (pixel >= activePixels) {
      strip_.setPixelColor(pixel, 0);
      continue;
    }

    const uint8_t zonePercent =
        static_cast<uint8_t>((pixel * 100) / max<uint16_t>(1, board::kNeoPixelCount - 1));
    if (zonePercent < 60) {
      strip_.setPixelColor(pixel, strip_.Color(0, 180, 30));
    } else if (zonePercent < 84) {
      strip_.setPixelColor(pixel, strip_.Color(180, 110, 0));
    } else {
      strip_.setPixelColor(pixel, strip_.Color(220, 0, 0));
    }
  }
}

void LedService::showCalm(uint32_t nowMs) {
  const uint8_t hue = static_cast<uint8_t>((nowMs / 90) & 0xFF);
  const uint8_t breath = static_cast<uint8_t>(18 + ((sin(nowMs / 900.0F) + 1.0F) * 18.0F));
  const uint32_t color = scaleColor(wheelColor(hue), breath);
  strip_.fill(color);
}

void LedService::showSelectedPattern(uint32_t nowMs) {
  const uint16_t count = pixelCount_;
  switch (selectedPattern_) {
    case 1:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint8_t hue = static_cast<uint8_t>((pixel * 17 + ledPhase_ * 19) & 0xFF);
        strip_.setPixelColor(pixel, (pixel + ledPhase_) % 3 == 0 ? wheelColor(hue) : 0);
      }
      break;
    case 2:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint8_t hue = static_cast<uint8_t>((pixel * 255 / max<uint16_t>(1, count) + ledPhase_ * 10) & 0xFF);
        strip_.setPixelColor(pixel, wheelColor(hue));
      }
      break;
    case 3:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint16_t head = (ledPhase_ * 2) % max<uint16_t>(1, count);
        const uint16_t distance = (pixel > head) ? pixel - head : head - pixel;
        const uint8_t glow = distance == 0 ? 255 : (distance == 1 ? 120 : (distance == 2 ? 35 : 0));
        strip_.setPixelColor(pixel, strip_.Color(glow, glow / 3, 255));
      }
      break;
    case 4:
      strip_.fill((ledPhase_ % 4) < 2 ? strip_.Color(255, 80, 0) : strip_.Color(255, 0, 140));
      break;
    case 5:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint8_t flicker = random(90, 256);
        strip_.setPixelColor(pixel, (pixel + ledPhase_) % 4 == 0
            ? strip_.Color(255, flicker / 2, 0) : strip_.Color(flicker / 5, 0, 0));
      }
      break;
    case 6:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint16_t pos = ledPhase_ % max<uint16_t>(1, count * 2 - 2);
        const uint16_t head = pos < count ? pos : count * 2 - 2 - pos;
        strip_.setPixelColor(pixel, pixel == head ? strip_.Color(255, 255, 255) : strip_.Color(0, 40, 180));
      }
      break;
    case 7:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint8_t hue = static_cast<uint8_t>(
            (pixel * 255 / max<uint16_t>(1, count) + ledPhase_ * 8) & 0xFF);
        strip_.setPixelColor(pixel, wheelColor(hue));
      }
      break;
    case 8:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const bool star = ((pixel * 13 + ledPhase_ * 7) % 23) < 3;
        strip_.setPixelColor(pixel, star ? strip_.Color(255, 255, 255) : strip_.Color(10, 0, 40));
      }
      break;
    case 9:
      strip_.fill((ledPhase_ % 3) == 0 ? strip_.Color(255, 70, 180) : strip_.Color(80, 0, 255));
      break;
    case 10:
      for (uint16_t pixel = 0; pixel < count; ++pixel) {
        const uint8_t hue = static_cast<uint8_t>((pixel * 31 + ledPhase_ * 5) & 0xFF);
        strip_.setPixelColor(pixel, (pixel + ledPhase_) % 5 == 0 ? wheelColor(hue) : 0);
      }
      break;
    default:
      showCalm(nowMs);
      break;
  }
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
      sendBitBangFrame(64, 0, 0, pixelCount_);
      break;
    case 1:
      Serial.println("[LEDS-BITBANG] VERDE por 3 segundos.");
      sendBitBangFrame(0, 64, 0, pixelCount_);
      break;
    case 2:
      Serial.println("[LEDS-BITBANG] AZUL por 3 segundos.");
      sendBitBangFrame(0, 0, 64, pixelCount_);
      break;
    case 3:
      Serial.println("[LEDS-BITBANG] BRANCO por 3 segundos.");
      sendBitBangFrame(48, 48, 48, pixelCount_);
      break;
    default:
      Serial.println("[LEDS-BITBANG] APAGADO por 3 segundos.");
      sendBitBangFrame(0, 0, 0, pixelCount_);
      break;
  }
}

}  // namespace fefo
