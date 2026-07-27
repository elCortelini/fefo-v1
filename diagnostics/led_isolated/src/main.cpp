#include <Adafruit_NeoPixel.h>
#include <Arduino.h>

#include <esp_system.h>

namespace {

constexpr uint8_t kLedPin = 22;
constexpr uint8_t kBacklightPin = 27;
constexpr uint16_t kLedCount = 15;
constexpr uint8_t kBrightness = 76;
constexpr uint32_t kPixelStepMs = 100;
constexpr uint32_t kColorHoldMs = 5000;
constexpr uint32_t kOffHoldMs = 2000;

// O tipo inicial é exatamente o utilizado pelo FEFO 190.
Adafruit_NeoPixel strip(kLedCount, kLedPin, NEO_GRB + NEO_KHZ800);

void clearStrip() {
  strip.clear();
  strip.show();
}

void runProgressiveTest(neoPixelType type, const char* description,
                        uint8_t red, uint8_t green, uint8_t blue,
                        bool backlightOn) {
  // Só a frequência muda entre as duas fases. Pino, quantidade, ordem GRB,
  // brilho e biblioteca permanecem idênticos, isolando a hipótese de timing.
  strip.updateType(type);
  clearStrip();
  digitalWrite(kBacklightPin, LOW);
  delay(kOffHoldMs);

  // O backlight não participa do sinal NeoPixel. Ele serve apenas para o
  // usuário comprovar visualmente qual firmware/fase está em execução.
  digitalWrite(kBacklightPin, backlightOn ? HIGH : LOW);
  Serial.printf("[LED-ISO] INICIO %s.\n", description);
  for (uint16_t pixel = 0; pixel < kLedCount; ++pixel) {
    strip.setPixelColor(pixel, red, green, blue);
    strip.show();
    delay(kPixelStepMs);
  }
  Serial.printf("[LED-ISO] %s completo; mantendo por %lu ms.\n", description,
                static_cast<unsigned long>(kColorHoldMs));
  delay(kColorHoldMs);

  clearStrip();
  digitalWrite(kBacklightPin, LOW);
  Serial.printf("[LED-ISO] FIM %s; LEDs apagados.\n", description);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n[LED-ISO] Diagnostico isolado FEFO / GPIO 22 / 15 LEDs.");
#if defined(ESP_ARDUINO_VERSION_MAJOR)
  Serial.printf("[LED-ISO] Arduino-ESP32 %d.%d.%d; ESP-IDF %s.\n",
                ESP_ARDUINO_VERSION_MAJOR, ESP_ARDUINO_VERSION_MINOR,
                ESP_ARDUINO_VERSION_PATCH, esp_get_idf_version());
#else
  Serial.printf("[LED-ISO] ESP-IDF %s.\n", esp_get_idf_version());
#endif

  pinMode(kLedPin, OUTPUT);
  digitalWrite(kLedPin, LOW);
  pinMode(kBacklightPin, OUTPUT);
  digitalWrite(kBacklightPin, LOW);
  const bool initialized = strip.begin();
  strip.setBrightness(kBrightness);
  clearStrip();
  Serial.printf("[LED-ISO] Adafruit begin()=%s; brilho=%u/255.\n",
                initialized ? "OK" : "FALHA", kBrightness);
}

void loop() {
  Serial.println("[LED-ISO] === NOVO CICLO ===");

  // Azul a 800 kHz reproduz a sequência que funcionava no FEFO 190.
  runProgressiveTest(NEO_GRB + NEO_KHZ800, "AZUL / GRB / 800 kHz", 0, 0,
                     100, true);

  // Magenta identifica visualmente a tentativa alternativa de 400 kHz.
  runProgressiveTest(NEO_GRB + NEO_KHZ400, "MAGENTA / GRB / 400 kHz", 100,
                     0, 100, false);
}
