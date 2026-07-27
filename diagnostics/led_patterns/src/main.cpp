#include <Arduino.h>
#include <TFT_eSPI.h>

#include "LedPatternPlayer.h"
#include "LedTransportLab.h"

namespace {

using fefo::led_test::LedPatternPlayer;
using fefo::led_test::LedTransportLab;
using fefo::led_test::RgbColor;

constexpr uint8_t kBacklightPin = 27;
constexpr uint8_t kMotorPin = 21;
constexpr uint8_t kAudioPin = 26;
constexpr uint8_t kSdCsPin = 5;
constexpr uint32_t kProgressRefreshMs = 50;
constexpr uint32_t kPreviewRefreshMs = 50;
constexpr uint32_t kProbeHoldMs = 2000;

constexpr int16_t kPreviewX = 18;
constexpr int16_t kPreviewY = 165;
constexpr int16_t kPreviewWidth = 25;
constexpr int16_t kPreviewHeight = 35;
constexpr int16_t kPreviewGap = 5;

uint32_t completedLabCycles = 0;

TFT_eSPI display;
LedTransportLab transports;
LedPatternPlayer player;

uint8_t activeTransport = 0;
uint8_t displayedPattern = UINT8_MAX;
uint32_t lastProgressAtMs = 0;
uint32_t lastPreviewAtMs = 0;
bool diagnosticReady = false;
bool probePassed = false;

uint16_t previewColor(const RgbColor& color) {
  // A TFT amplifica somente a visualização; o vetor elétrico não é alterado.
  const uint8_t red = min<uint16_t>(255, color.red * 4);
  const uint8_t green = min<uint16_t>(255, color.green * 4);
  const uint8_t blue = min<uint16_t>(255, color.blue * 4);
  return display.color565(red, green, blue);
}

void drawStaticScreen() {
  display.fillScreen(TFT_BLACK);
  display.fillRect(0, 0, 480, 52, TFT_NAVY);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, TFT_NAVY);
  display.drawString("FEFO V0.0.3 | LABORATORIO GPIO22", 240, 17, 2);
  display.setTextColor(probePassed ? TFT_GREEN : TFT_ORANGE, TFT_NAVY);
  display.drawString(probePassed ? "PAD LOCAL OK | MEDIR PINO E DIN"
                                 : "PAD LOCAL A VERIFICAR",
                     240, 39, 2);

  display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  display.drawString("PREVIA TFT: BRILHO AMPLIADO", 240, 226, 2);
  display.drawRoundRect(29, 246, 422, 20, 4, TFT_DARKGREY);
}

void drawProbePhase(const char* level, const char* instruction,
                    uint16_t levelColor) {
  display.fillScreen(TFT_BLACK);
  display.fillRect(0, 0, 480, 52, TFT_NAVY);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, TFT_NAVY);
  display.drawString("TESTE ELETRICO DO GPIO 22", 240, 25, 4);

  display.setTextColor(levelColor, TFT_BLACK);
  display.drawString(level, 240, 105, 4);
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.drawString(instruction, 240, 158, 2);
  display.setTextColor(TFT_CYAN, TFT_BLACK);
  display.drawString("MEDIR NO PINO 22 E NO DIN DO PRIMEIRO LED", 240, 205, 2);
  display.setTextColor(TFT_YELLOW, TFT_BLACK);
  display.drawString("DRIVE MINIMO | PULL INTERNO DESLIGADO", 240, 253,
                     2);
}

bool runElectricalProbe() {
  transports.prepareElectricalProbe();

  transports.setProbeLevel(true);
  drawProbePhase("HIGH POR 2 SEGUNDOS", "ESPERADO: APROXIMADAMENTE 3,3 V",
                 TFT_GREEN);
  delay(kProbeHoldMs);
  const bool highReadback = transports.readProbeLevel();

  transports.setProbeLevel(false);
  drawProbePhase("LOW POR 2 SEGUNDOS", "ESPERADO: APROXIMADAMENTE 0 V",
                 TFT_RED);
  delay(kProbeHoldMs);
  const bool lowReadback = transports.readProbeLevel();

  const bool passed = highReadback && !lowReadback;
  Serial.printf("[LED-LAB] Retorno GPIO22: HIGH=%u; LOW=%u; resultado=%s.\n",
                highReadback, lowReadback, passed ? "OK" : "FALHA");

  display.fillScreen(passed ? TFT_DARKGREEN : TFT_RED);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, passed ? TFT_DARKGREEN : TFT_RED);
  display.drawString(passed ? "LEITURA LOCAL DO PAD: OK"
                            : "LEITURA LOCAL DO PAD: FALHA",
                     240, 135, 4);
  display.drawString(passed ? "Ainda e necessario medir o DIN externamente"
                            : "Drivers bloqueados por seguranca",
                     240, 190, 2);
  delay(1000);
  return passed;
}

void drawMethodHeader() {
  display.fillRect(0, 55, 480, 103, TFT_BLACK);
  display.setTextDatum(MC_DATUM);

  char methodCounter[32];
  snprintf(methodCounter, sizeof(methodCounter), "METODO %u / %u",
           activeTransport + 1, fefo::led_test::kTransportCount);
  display.setTextColor(TFT_YELLOW, TFT_BLACK);
  display.drawString(methodCounter, 240, 66, 2);

  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.drawString(transports.info().name, 240, 91, 4);
  display.setTextColor(TFT_CYAN, TFT_BLACK);
  display.drawString(transports.activeDetail(player.patternIndex()), 240, 118,
                     2);

  char patternLine[64];
  snprintf(patternLine, sizeof(patternLine), "PADRAO %u/5: %s",
           player.patternIndex() + 1, player.info().name);
  display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  display.drawString(patternLine, 240, 146, 2);

  Serial.printf("[LED-LAB] %s | Padrao %u/5: %s | %s.\n",
                transports.info().name, player.patternIndex() + 1,
                player.info().name,
                transports.activeDetail(player.patternIndex()));
}

void drawLedPreview() {
  const RgbColor* pixels = player.pixels();
  display.setTextDatum(MC_DATUM);

  for (size_t index = 0; index < fefo::led_test::kLedCount; ++index) {
    const int16_t x = kPreviewX + index * (kPreviewWidth + kPreviewGap);
    const uint16_t color = previewColor(pixels[index]);
    display.fillRoundRect(x, kPreviewY, kPreviewWidth, kPreviewHeight, 4,
                          color);
    display.drawRoundRect(x, kPreviewY, kPreviewWidth, kPreviewHeight, 4,
                          TFT_DARKGREY);
    display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    display.drawNumber(index + 1, x + kPreviewWidth / 2,
                       kPreviewY + kPreviewHeight + 9, 1);
  }
}

void drawProgress(uint32_t nowMs) {
  const uint32_t elapsed = player.patternElapsedMs(nowMs);
  const int16_t filled = static_cast<int16_t>(
      elapsed * 418 / fefo::led_test::kPatternDurationMs);

  display.fillRect(31, 248, 418, 16, TFT_DARKGREY);
  if (filled > 0) display.fillRect(31, 248, filled, 16, TFT_GREEN);

  const uint32_t remainingRounded = player.patternRemainingMs(nowMs) + 99;
  char status[80];
  snprintf(status, sizeof(status),
           "TROCA EM %lu.%lus | CICLO COMPLETO: %lu",
           static_cast<unsigned long>(remainingRounded / 1000),
           static_cast<unsigned long>((remainingRounded % 1000) / 100),
           static_cast<unsigned long>(completedLabCycles));
  display.fillRect(0, 272, 480, 42, TFT_BLACK);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.drawString(status, 240, 292, 2);
}

void showFatalError(const char* message) {
  diagnosticReady = false;
  transports.release();
  display.fillScreen(TFT_RED);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, TFT_RED);
  display.drawString("ERRO NO LABORATORIO LED", 240, 130, 4);
  display.drawString(message, 240, 180, 2);
  Serial.printf("[LED-LAB] ERRO FATAL: %s.\n", message);
}

bool activateTransport(uint8_t index) {
  activeTransport = index;
  displayedPattern = UINT8_MAX;

  if (!transports.select(activeTransport)) return false;
  // A janela de dois segundos começa somente depois que o periférico terminou
  // sua inicialização; todos os métodos recebem o mesmo tempo útil.
  player.begin(millis());

  transports.show(player.pixels(), fefo::led_test::kLedCount,
                  player.patternIndex());
  drawMethodHeader();
  drawLedPreview();
  drawProgress(millis());
  displayedPattern = player.patternIndex();
  lastPreviewAtMs = millis();
  lastProgressAtMs = millis();
  return true;
}

void finishLabCycle() {
  ++completedLabCycles;
  display.fillScreen(TFT_NAVY);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, TFT_NAVY);
  display.drawString("5 METODOS CONCLUIDOS", 240, 120, 4);
  display.drawString("Drivers liberados; repetindo sem reset...", 240, 170, 2);
  Serial.printf("[LED-LAB] Ciclo %lu concluido; repetindo sem reset.\n",
                static_cast<unsigned long>(completedLabCycles));
  delay(800);
  drawStaticScreen();
  if (!activateTransport(0)) {
    showFatalError("Falha ao reiniciar o ciclo de transportes");
  }
}

void advanceTransport() {
  transports.release();
  const uint8_t next = activeTransport + 1;
  if (next >= fefo::led_test::kTransportCount) {
    finishLabCycle();
    return;
  }
  if (!activateTransport(next)) showFatalError("Falha ao iniciar transporte");
}

}  // namespace

void setup() {
  // Estado seguro antes de Serial, delays ou display. O GPIO22 começa em alta
  // impedância até a prova local de baixa corrente.
  pinMode(kMotorPin, OUTPUT);
  digitalWrite(kMotorPin, LOW);
  dacWrite(kAudioPin, 0);
  pinMode(fefo::led_test::kLedPin, INPUT);
  pinMode(kSdCsPin, OUTPUT);
  digitalWrite(kSdCsPin, HIGH);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n[LED-LAB] FEFO V0.0.3 / laboratorio multi-driver iniciado.");

  pinMode(kBacklightPin, OUTPUT);
  digitalWrite(kBacklightPin, LOW);
  display.init();
  display.setRotation(1);
  digitalWrite(kBacklightPin, HIGH);

  probePassed = runElectricalProbe();
  if (!probePassed) {
    transports.releaseElectricalProbe();
    showFatalError("GPIO22 nao alternou localmente; drivers bloqueados");
    return;
  }
  drawStaticScreen();

  if (!activateTransport(0)) {
    showFatalError("Falha ao iniciar Adafruit config. 190");
    return;
  }
  diagnosticReady = true;
}

void loop() {
  if (!diagnosticReady) {
    delay(100);
    return;
  }

  const uint32_t nowMs = millis();
  const bool frameChanged = player.update(nowMs);

  // Cada método recebe exatamente uma volta pelos cinco padrões (10 s).
  if (player.completedLoops() > 0) {
    advanceTransport();
    return;
  }

  if (frameChanged) {
    transports.show(player.pixels(), fefo::led_test::kLedCount,
                    player.patternIndex());
    const bool patternChanged = displayedPattern != player.patternIndex();
    if (patternChanged) {
      displayedPattern = player.patternIndex();
      drawMethodHeader();
    }
    if (patternChanged || nowMs - lastPreviewAtMs >= kPreviewRefreshMs) {
      lastPreviewAtMs = nowMs;
      drawLedPreview();
    }
  }

  if (nowMs - lastProgressAtMs >= kProgressRefreshMs) {
    lastProgressAtMs = nowMs;
    drawProgress(nowMs);
  }

  delay(5);
}
