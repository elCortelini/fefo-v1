#include "LedBitBangDriver.h"

#include <driver/gpio.h>
#include <esp_attr.h>
#include <freertos/FreeRTOS.h>
#include <freertos/portmacro.h>
#include <soc/gpio_struct.h>
#include <xtensa/core-macros.h>

namespace fefo::led_test {
namespace {

struct TimingProfile {
  const char* name;
  uint32_t bitCycles;
  uint32_t zeroHighCycles;
  uint32_t oneHighCycles;
};

// Cada perfil ocupa um dos cinco padrões. A varredura cobre WS2812 antigos,
// revisões mais novas, SK6812 e a variante lenta de 400 kHz.
constexpr TimingProfile kTimingProfiles[kBitBangProfileCount] = {
    {"800k 400/800 ns", 300, 96, 192},
    {"833k 350/700 ns", 288, 84, 168},
    {"800k 300/750 ns", 300, 72, 180},
    {"SK6812 300/600 ns", 300, 72, 144},
    {"400k 500/1200 ns", 600, 120, 288},
};

constexpr uint32_t kLedPinMask = 1UL << kLedPin;
constexpr size_t kFrameBytes = kLedCount * 3;

static_assert(F_CPU == 240000000L,
              "O transporte NeoPixel direto exige CPU fixa em 240 MHz");
static_assert(kLedPin < 32,
              "Este transporte usa o registrador dos GPIOs 0 a 31");

portMUX_TYPE bitBangMux = portMUX_INITIALIZER_UNLOCKED;

// O quadro fica obrigatoriamente na RAM para não depender da cache de flash
// enquanto as interrupções locais estão suspensas.
DRAM_ATTR uint8_t frame[kFrameBytes];

static inline __attribute__((always_inline)) void waitFrom(
    uint32_t startedAt, uint32_t targetCycles) {
  while (static_cast<uint32_t>(XTHAL_GET_CCOUNT() - startedAt) <
         targetCycles) {
    __asm__ __volatile__("nop");
  }
}

void IRAM_ATTR writeFrame(const uint8_t* data, size_t length,
                          uint32_t bitCycles, uint32_t zeroHighCycles,
                          uint32_t oneHighCycles) {
  portENTER_CRITICAL(&bitBangMux);
  for (size_t byteIndex = 0; byteIndex < length; ++byteIndex) {
    const uint8_t value = data[byteIndex];
    for (uint8_t mask = 0x80; mask != 0; mask >>= 1) {
      const uint32_t bitStartedAt = XTHAL_GET_CCOUNT();
      GPIO.out_w1ts = kLedPinMask;
      waitFrom(bitStartedAt,
               value & mask ? oneHighCycles : zeroHighCycles);
      GPIO.out_w1tc = kLedPinMask;
      waitFrom(bitStartedAt, bitCycles);
    }
  }
  GPIO.out_w1tc = kLedPinMask;
  portEXIT_CRITICAL(&bitBangMux);

  // Valor deliberadamente longo para atender também clones com reset lento.
  delayMicroseconds(800);
}

}  // namespace

bool LedBitBangDriver::begin() {
  pinMode(kLedPin, OUTPUT);
  digitalWrite(kLedPin, LOW);
  gpio_set_drive_capability(static_cast<gpio_num_t>(kLedPin),
                            GPIO_DRIVE_CAP_3);
  delayMicroseconds(800);

  if (getCpuFrequencyMhz() != 240) {
    Serial.printf("[LED-LAB] ERRO: CPU em %u MHz; esperado 240 MHz.\n",
                  getCpuFrequencyMhz());
    return false;
  }

  clear();
  Serial.printf("[LED-LAB] Bit-bang pronto no GPIO %u; %u LEDs GRB.\n",
                kLedPin, static_cast<unsigned>(kLedCount));
  return true;
}

bool LedBitBangDriver::setTimingProfile(uint8_t profileIndex) {
  if (profileIndex >= kBitBangProfileCount) return false;
  timingProfile_ = profileIndex;
  return true;
}

void LedBitBangDriver::show(const RgbColor* pixels, size_t count) {
  if (pixels == nullptr || count != kLedCount) return;

  for (size_t pixel = 0; pixel < kLedCount; ++pixel) {
    // A fita recebe os três bytes na ordem verde, vermelho e azul.
    frame[pixel * 3] = pixels[pixel].green;
    frame[pixel * 3 + 1] = pixels[pixel].red;
    frame[pixel * 3 + 2] = pixels[pixel].blue;
  }

  const TimingProfile& timing = kTimingProfiles[timingProfile_];
  writeFrame(frame, sizeof(frame), timing.bitCycles, timing.zeroHighCycles,
             timing.oneHighCycles);
}

void LedBitBangDriver::clear() {
  for (size_t index = 0; index < sizeof(frame); ++index) frame[index] = 0;
  const TimingProfile& timing = kTimingProfiles[timingProfile_];
  writeFrame(frame, sizeof(frame), timing.bitCycles, timing.zeroHighCycles,
             timing.oneHighCycles);
}

const char* LedBitBangDriver::timingName() const {
  return kTimingProfiles[timingProfile_].name;
}

}  // namespace fefo::led_test
