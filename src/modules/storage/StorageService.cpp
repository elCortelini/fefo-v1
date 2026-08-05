#include "modules/storage/StorageService.h"

#include <SD.h>

#include "board/Fefo35Board.h"

namespace fefo {

bool StorageService::begin() {
  SD.end();
  pinMode(board::kSdCs, OUTPUT);
  digitalWrite(board::kSdCs, HIGH);
  delay(20);

  spi_.begin(board::kSdClock, board::kSdMiso, board::kSdMosi, board::kSdCs);
  const uint32_t frequencies[] = {
      board::kSdFrequencyHz,
      10000000,
      4000000,
      1000000,
  };

  available_ = false;
  for (uint32_t frequency : frequencies) {
    Serial.printf("[STORAGE] Tentando montar microSD em %lu Hz.\n",
                  static_cast<unsigned long>(frequency));
    available_ = SD.begin(board::kSdCs, spi_, frequency);
    if (available_) break;
    SD.end();
    digitalWrite(board::kSdCs, HIGH);
    delay(80);
  }

  if (!available_) {
    Serial.println("[STORAGE] microSD ausente ou falhou ao montar; modo degradado.");
    return false;
  }

  capacityBytes_ = SD.totalBytes();
  usedBytes_ = SD.usedBytes();
  Serial.printf("[STORAGE] microSD OK: %llu MB total, %llu MB usados.\n",
                capacityBytes_ / (1024ULL * 1024ULL),
                usedBytes_ / (1024ULL * 1024ULL));
  return true;
}

}  // namespace fefo
