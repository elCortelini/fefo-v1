#include "modules/diagnostics/DiagnosticsService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"
#include "modules/panic/PanicConfig.h"

namespace fefo {

void DiagnosticsService::printBootReport(SystemState state,
                                         bool storageAvailable) const {
  Serial.printf("\n======= FEFO V%s / CHECKPOINT DIAGNOSTICO =======\n",
                board::kFirmwareVersion);
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
  Serial.printf("Pânico: ativo (ruido + vibracao + sirene, maximo %lu ms)\n",
                static_cast<unsigned long>(panic::kMaxActiveMs));
  Serial.println("OTA BLE: interface bloqueada na Fase 0");
  Serial.println("===========================================\n");
}

}  // namespace fefo
