#include "SpiEncodedDriver.h"

#include <SPI.h>
#include <driver/gpio.h>

namespace fefo::led_test {
namespace {

constexpr uint8_t kSpiClockPin = 18;
constexpr uint32_t kSpiFrequencyHz = 2400000;
constexpr size_t kEncodedBytesPerColorByte = 3;
constexpr size_t kEncodedFrameBytes =
    kLedCount * 3 * kEncodedBytesPerColorByte;

SPIClass ledSpi(HSPI);
uint8_t encodedFrame[kEncodedFrameBytes];

void encodeByte(uint8_t value, uint8_t* destination) {
  uint32_t encoded = 0;
  for (uint8_t mask = 0x80; mask != 0; mask >>= 1) {
    encoded = (encoded << 3) | ((value & mask) ? 0b110 : 0b100);
  }
  destination[0] = static_cast<uint8_t>(encoded >> 16);
  destination[1] = static_cast<uint8_t>(encoded >> 8);
  destination[2] = static_cast<uint8_t>(encoded);
}

}  // namespace

bool SpiEncodedDriver::begin() {
  // O TFT usa VSPI. O HSPI fica livre neste diagnóstico porque o microSD não
  // é inicializado; seu MOSI é remapeado exclusivamente para o GPIO 22.
  ledSpi.begin(kSpiClockPin, -1, kLedPin, -1);
  gpio_set_drive_capability(static_cast<gpio_num_t>(kLedPin),
                            GPIO_DRIVE_CAP_3);
  ready_ = true;
  clear();
  Serial.println(
      "[LED-LAB] SPI codificado pronto: HSPI 2,4 MHz; 0=100; 1=110.");
  return true;
}

void SpiEncodedDriver::show(const RgbColor* pixels, size_t count) {
  if (!ready_ || pixels == nullptr || count != kLedCount) return;

  size_t output = 0;
  for (size_t pixel = 0; pixel < kLedCount; ++pixel) {
    // A ordem elétrica permanece GRB, igual ao FEFO 190.
    encodeByte(pixels[pixel].green, &encodedFrame[output]);
    output += kEncodedBytesPerColorByte;
    encodeByte(pixels[pixel].red, &encodedFrame[output]);
    output += kEncodedBytesPerColorByte;
    encodeByte(pixels[pixel].blue, &encodedFrame[output]);
    output += kEncodedBytesPerColorByte;
  }

  ledSpi.beginTransaction(SPISettings(kSpiFrequencyHz, MSBFIRST, SPI_MODE0));
  ledSpi.writeBytes(encodedFrame, sizeof(encodedFrame));
  ledSpi.endTransaction();
  delayMicroseconds(800);
}

void SpiEncodedDriver::clear() {
  RgbColor off[kLedCount]{};
  show(off, kLedCount);
}

void SpiEncodedDriver::end() {
  if (!ready_) return;
  clear();
  ledSpi.end();
  ready_ = false;
}

}  // namespace fefo::led_test
