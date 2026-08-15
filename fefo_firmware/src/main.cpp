#include <Arduino.h>

#include "app/AppController.h"

// O arquivo principal contém apenas o ciclo de vida Arduino. Toda regra de
// negócio e todo acesso a hardware pertencem aos módulos especializados.
namespace {
fefo::AppController app;
}

void setup() {
  app.begin();
}

void loop() {
  app.update();
}

