#include "modules/diagnostics/DiagnosticsService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {

void DiagnosticsService::printBootReport(SystemState state,
                                         bool storageAvailable) const {
  Serial.println("\n========== FEFO V0.0.1 / FASE 0 ==========");
  Serial.printf("Placa: %s\n", board::kBoardName);
  Serial.printf("Estado: %s\n", systemStateName(state));
  Serial.printf("Chip: %s rev.%u, %u cores, %u MHz\n", ESP.getChipModel(),
                ESP.getChipRevision(), ESP.getChipCores(), ESP.getCpuFreqMHz());
  Serial.printf("Flash: %u bytes | Sketch: %u bytes\n", ESP.getFlashChipSize(),
                ESP.getSketchSize());
  Serial.printf("Heap livre: %u bytes | minimo: %u bytes\n", ESP.getFreeHeap(),
                ESP.getMinFreeHeap());
  Serial.printf("PSRAM: %s\n", psramFound() ? "presente" : "ausente");
  Serial.printf("microSD: %s\n", storageAvailable ? "pronto" : "indisponivel");
  Serial.println("Pânico: isolado/desabilitado");
  Serial.println("OTA BLE: interface bloqueada na Fase 0");
  Serial.println("===========================================\n");
}

}  // namespace fefo

