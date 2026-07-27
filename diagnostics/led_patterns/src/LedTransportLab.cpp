#include "LedTransportLab.h"

#include <Adafruit_NeoPixel.h>
#include <FastLED.h>
#include <NeoPixelBus.h>
#include <driver/gpio.h>

#include "SpiEncodedDriver.h"

namespace fefo::led_test {
namespace {

constexpr uint16_t kLegacyLogicalCount = 35;
constexpr uint8_t kLegacyBrightness = 76;
constexpr uint8_t kFastLedBrightness = 80;

constexpr TransportInfo kTransports[kTransportCount] = {
    {"ADAFRUIT CONFIG 190", "core2 | 35 px logicos | GRB 800k | B76"},
    {"FASTLED VU LEGADO", "WS2812B | 15 px | GRB | brilho 80"},
    {"NEOPIXELBUS I2S1", "I2S1 + DMA | 15 px | sem RMT"},
    {"SPI CODIFICADO", "HSPI 2,4 MHz | 0=100 | 1=110"},
    {"BITBANG VARREDURA", "Um perfil de tempo em cada padrao"},
};

Adafruit_NeoPixel legacyStrip(kLegacyLogicalCount, kLedPin,
                              NEO_GRB + NEO_KHZ800);
CRGB fastLedPixels[kLedCount];
using I2sStrip =
    NeoPixelBus<NeoGrbFeature, NeoEsp32I2s1Ws2812xMethod>;
I2sStrip* i2sStrip = nullptr;
SpiEncodedDriver spiDriver;
LedBitBangDriver bitBangDriver;

bool fastLedInitialized = false;

void prepareOutputPad() {
  const gpio_num_t pin = static_cast<gpio_num_t>(kLedPin);
  gpio_reset_pin(pin);
  gpio_set_pull_mode(pin, GPIO_FLOATING);
  gpio_set_drive_capability(pin, GPIO_DRIVE_CAP_3);
  pinMode(kLedPin, OUTPUT);
  digitalWrite(kLedPin, LOW);
  delayMicroseconds(1000);
}

uint8_t compensateBrightness(uint8_t value, uint8_t brightness) {
  if (value == 0) return 0;
  return min<uint16_t>(255, (static_cast<uint16_t>(value) * 255 +
                             brightness - 1) /
                                brightness);
}

}  // namespace

void LedTransportLab::prepareElectricalProbe() {
  const gpio_num_t pin = static_cast<gpio_num_t>(kLedPin);
  gpio_reset_pin(pin);
  gpio_set_pull_mode(pin, GPIO_FLOATING);
  // Usa a menor capacidade de drive durante a prova. Isso reduz a força da
  // saída, mas não limita a corrente nem substitui o resistor série físico.
  // A força máxima só entra depois de HIGH/LOW aprovados.
  gpio_set_drive_capability(pin, GPIO_DRIVE_CAP_0);
  pinMode(kLedPin, OUTPUT);
  digitalWrite(kLedPin, LOW);
  delayMicroseconds(1000);
  Serial.println(
      "[LED-LAB] Prova local GPIO22 com pull interno off e drive minimo.");
}

void LedTransportLab::setProbeLevel(bool high) {
  digitalWrite(kLedPin, high ? HIGH : LOW);
}

bool LedTransportLab::readProbeLevel() const {
  return digitalRead(kLedPin) == HIGH;
}

void LedTransportLab::releaseElectricalProbe() {
  digitalWrite(kLedPin, LOW);
  pinMode(kLedPin, INPUT);
  gpio_set_pull_mode(static_cast<gpio_num_t>(kLedPin), GPIO_FLOATING);
}

bool LedTransportLab::select(uint8_t transportIndex) {
  if (transportIndex >= kTransportCount) return false;

  activeTransport_ = transportIndex;
  selected_ = true;
  prepareOutputPad();

  switch (activeTransport_) {
    case 0:
      legacyStrip.begin();
      legacyStrip.setBrightness(kLegacyBrightness);
      legacyStrip.clear();
      legacyStrip.show();
      break;

    case 1:
      if (!fastLedInitialized) {
        FastLED.addLeds<WS2812B, kLedPin, GRB>(fastLedPixels, kLedCount);
        FastLED.setBrightness(kFastLedBrightness);
        FastLED.setDither(DISABLE_DITHER);
        fastLedInitialized = true;
      }
      fill_solid(fastLedPixels, kLedCount, CRGB::Black);
      FastLED.show();
      break;

    case 2:
      // Construção por rodada garante que o destrutor libere DMA, I2S1 e a
      // matriz do GPIO antes do método SPI seguinte.
      i2sStrip = new I2sStrip(kLedCount, kLedPin);
      if (i2sStrip == nullptr) return false;
      i2sStrip->Begin();
      i2sStrip->ClearTo(::RgbColor(0, 0, 0));
      i2sStrip->Show();
      while (!i2sStrip->CanShow()) yield();
      break;

    case 3:
      if (!spiDriver.begin()) return false;
      break;

    default:
      if (!bitBangDriver.begin()) return false;
      break;
  }

  Serial.printf("[LED-LAB] METODO %u/%u: %s | %s.\n",
                activeTransport_ + 1, kTransportCount,
                kTransports[activeTransport_].name,
                kTransports[activeTransport_].detail);
  return true;
}

void LedTransportLab::show(const RgbColor* pixels, size_t count,
                           uint8_t patternIndex) {
  if (!selected_ || pixels == nullptr || count != kLedCount) return;
  activePattern_ = patternIndex;

  switch (activeTransport_) {
    case 0:
      legacyStrip.clear();
      for (size_t i = 0; i < kLedCount; ++i) {
        legacyStrip.setPixelColor(
            i, compensateBrightness(pixels[i].red, kLegacyBrightness),
            compensateBrightness(pixels[i].green, kLegacyBrightness),
            compensateBrightness(pixels[i].blue, kLegacyBrightness));
      }
      legacyStrip.show();
      break;

    case 1:
      for (size_t i = 0; i < kLedCount; ++i) {
        fastLedPixels[i] = CRGB(
            compensateBrightness(pixels[i].red, kFastLedBrightness),
            compensateBrightness(pixels[i].green, kFastLedBrightness),
            compensateBrightness(pixels[i].blue, kFastLedBrightness));
      }
      FastLED.show();
      break;

    case 2:
      if (i2sStrip == nullptr) return;
      for (size_t i = 0; i < kLedCount; ++i) {
        i2sStrip->SetPixelColor(
            i, ::RgbColor(pixels[i].red, pixels[i].green, pixels[i].blue));
      }
      i2sStrip->Show();
      break;

    case 3:
      spiDriver.show(pixels, count);
      break;

    default:
      bitBangDriver.setTimingProfile(patternIndex % kBitBangProfileCount);
      bitBangDriver.show(pixels, count);
      break;
  }
}

void LedTransportLab::clear() {
  RgbColor off[kLedCount]{};
  // Conserva o perfil ativo: se apenas 400 kHz for aceito, o comando OFF não
  // pode voltar silenciosamente ao perfil nominal de 800 kHz.
  show(off, kLedCount, activePattern_);
  if (activeTransport_ == 2 && i2sStrip != nullptr) {
    while (!i2sStrip->CanShow()) yield();
  }
  delayMicroseconds(1000);
}

void LedTransportLab::release() {
  if (!selected_) return;
  clear();

  if (activeTransport_ == 2 && i2sStrip != nullptr) {
    delete i2sStrip;
    i2sStrip = nullptr;
  } else if (activeTransport_ == 3) {
    spiDriver.end();
  }

  // Desconecta qualquer sinal da matriz e deixa o DIN em repouso conhecido.
  prepareOutputPad();
  selected_ = false;
}

const TransportInfo& LedTransportLab::info() const {
  return kTransports[activeTransport_];
}

const char* LedTransportLab::activeDetail(uint8_t patternIndex) {
  if (activeTransport_ != 4) return info().detail;
  bitBangDriver.setTimingProfile(patternIndex % kBitBangProfileCount);
  return bitBangDriver.timingName();
}

}  // namespace fefo::led_test
