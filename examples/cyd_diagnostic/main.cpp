#include <Arduino.h>
#include <FS.h>
#include <LittleFS.h>
#include <SD.h>
#include <SPI.h>
#include <TFT_eSPI.h>

#include "cyd_pins.h"

namespace {

TFT_eSPI display;
SPIClass touchSpi(VSPI);

bool touchAvailable = false;
bool sdAvailable = false;
bool littleFsAvailable = false;
uint32_t lastUpdateMs = 0;

struct TouchPoint {
  uint16_t x;
  uint16_t y;
  uint16_t pressure;
};

uint16_t readTouchChannel(uint8_t command) {
  touchSpi.beginTransaction(SPISettings(2000000, MSBFIRST, SPI_MODE0));
  digitalWrite(cyd::kTouchCs, LOW);
  touchSpi.transfer(command);
  const uint16_t value =
      (static_cast<uint16_t>(touchSpi.transfer(0)) << 8 | touchSpi.transfer(0)) >> 3;
  digitalWrite(cyd::kTouchCs, HIGH);
  touchSpi.endTransaction();
  return value;
}

bool readTouch(TouchPoint& point) {
  if (digitalRead(cyd::kTouchIrq) != LOW) {
    return false;
  }
  point.x = readTouchChannel(0xD0);
  point.y = readTouchChannel(0x90);
  const uint16_t z1 = readTouchChannel(0xB0);
  const uint16_t z2 = readTouchChannel(0xC0);
  point.pressure = z1 + 4095 - z2;
  return point.pressure > 100;
}

void printBytes(const char* label, uint64_t value) {
  Serial.printf("%-22s %llu bytes\n", label, value);
}

void probeSdCard() {
  SPIClass sdSpi(VSPI);
  sdSpi.begin(cyd::kSdClock, cyd::kSdMiso, cyd::kSdMosi, cyd::kSdCs);
  sdAvailable = SD.begin(cyd::kSdCs, sdSpi, 10000000);

  if (sdAvailable) {
    Serial.printf("microSD: detectado, tipo=%u, capacidade=%llu MB\n",
                  static_cast<unsigned>(SD.cardType()),
                  SD.cardSize() / (1024ULL * 1024ULL));
    SD.end();
  } else {
    Serial.println("microSD: nao detectado (slot vazio ou cartao incompativel)");
  }

  sdSpi.end();
}

void probeDisplay() {
  pinMode(cyd::kBacklight, OUTPUT);
  digitalWrite(cyd::kBacklight, HIGH);
  display.init();
  display.setRotation(1);
  display.fillScreen(TFT_BLACK);

  const uint8_t id1 = display.readcommand8(0xD3, 1);
  const uint8_t id2 = display.readcommand8(0xD3, 2);
  const uint8_t id3 = display.readcommand8(0xD3, 3);
  Serial.printf("LCD resposta D3: %02X %02X %02X", id1, id2, id3);
  Serial.println(id2 == 0x93 && id3 == 0x41 ? " (ILI9341 confirmado)" : " (ILI9341 presumido)");
}

void probeTouch() {
  touchSpi.begin(cyd::kTouchClock, cyd::kTouchMiso, cyd::kTouchMosi,
                 cyd::kTouchCs);
  pinMode(cyd::kTouchCs, OUTPUT);
  digitalWrite(cyd::kTouchCs, HIGH);
  pinMode(cyd::kTouchIrq, INPUT);
  const uint16_t probe = readTouchChannel(0xD0);
  touchAvailable = probe <= 4095;
  Serial.printf("Touch XPT2046: %s; IRQ GPIO %d=%s\n",
                touchAvailable ? "inicializado" : "nao respondeu",
                cyd::kTouchIrq, digitalRead(cyd::kTouchIrq) ? "HIGH" : "LOW");
}

void printInventory() {
  Serial.println("\n=== Inventario CYD ESP32-2432S028 ===");
  Serial.printf("Chip: %s, revisao %u, %u cores, %u MHz\n",
                ESP.getChipModel(), ESP.getChipRevision(), ESP.getChipCores(),
                ESP.getCpuFreqMHz());
  Serial.printf("MAC Wi-Fi: %012llX\n", ESP.getEfuseMac());
  printBytes("Flash fisica:", ESP.getFlashChipSize());
  printBytes("Firmware usado:", ESP.getSketchSize());
  printBytes("Espaco para firmware:", ESP.getFreeSketchSpace());
  printBytes("Heap total:", ESP.getHeapSize());
  printBytes("Heap livre:", ESP.getFreeHeap());
  printBytes("Heap minimo livre:", ESP.getMinFreeHeap());
  Serial.printf("PSRAM: %s\n", psramFound() ? "detectada" : "nao instalada");
  if (psramFound()) {
    printBytes("PSRAM total:", ESP.getPsramSize());
    printBytes("PSRAM livre:", ESP.getFreePsram());
  }
  Serial.printf("LittleFS: %s\n", littleFsAvailable ? "disponivel" : "indisponivel");
  if (littleFsAvailable) {
    printBytes("LittleFS total:", LittleFS.totalBytes());
    printBytes("LittleFS usado:", LittleFS.usedBytes());
  }
  Serial.printf("Sensor de luz GPIO 34: %d/4095\n", analogRead(cyd::kLightSensor));
  Serial.printf("LCD: %dx%d (rotacao paisagem)\n", display.width(), display.height());
  Serial.printf("Touch: %s\n", touchAvailable ? "pronto" : "nao confirmado");
  Serial.printf("microSD: %s\n", sdAvailable ? "cartao detectado no boot" : "sem cartao");
  Serial.println("===================================\n");
}

void drawDashboard() {
  display.fillScreen(TFT_NAVY);
  display.setTextColor(TFT_WHITE, TFT_NAVY);
  display.setTextDatum(TL_DATUM);
  display.drawString("CYD pronta para desenvolvimento", 12, 10, 4);
  display.drawFastHLine(12, 39, 296, TFT_CYAN);
  display.setTextColor(TFT_CYAN, TFT_NAVY);
  display.drawString("ESP32-D0WD-V3 | Flash 4 MB", 12, 50, 2);
  display.drawString("LCD ILI9341 320x240", 12, 72, 2);
  display.drawString(touchAvailable ? "Touch XPT2046: OK" : "Touch: verificar", 12, 94, 2);
  display.drawString(sdAvailable ? "microSD: detectado" : "microSD: sem cartao", 12, 116, 2);
  display.drawString(psramFound() ? "PSRAM: detectada" : "PSRAM: nao instalada", 12, 138, 2);
  display.setTextColor(TFT_YELLOW, TFT_NAVY);
  display.drawString("Toque na tela para testar", 12, 174, 2);
}

void updateDiagnostics() {
  const int light = analogRead(cyd::kLightSensor);
  display.fillRect(12, 202, 296, 24, TFT_NAVY);
  display.setTextColor(TFT_GREEN, TFT_NAVY);
  display.drawString("Luz: " + String(light) + "  Heap: " +
                         String(ESP.getFreeHeap() / 1024) + " KB",
                     12, 202, 2);

  TouchPoint point{};
  if (touchAvailable && readTouch(point)) {
    Serial.printf("Touch bruto: x=%d y=%d pressao=%d\n", point.x, point.y,
                  point.pressure);
    display.fillCircle(300, 214, 8, TFT_RED);
  } else {
    display.fillCircle(300, 214, 8, TFT_DARKGREY);
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  littleFsAvailable = LittleFS.begin(true);
  probeDisplay();
  probeSdCard();
  probeTouch();
  printInventory();
  drawDashboard();
}

void loop() {
  const uint32_t now = millis();
  if (now - lastUpdateMs >= 250) {
    lastUpdateMs = now;
    updateDiagnostics();
  }
}
