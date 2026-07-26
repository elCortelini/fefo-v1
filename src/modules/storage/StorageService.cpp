#include "modules/storage/StorageService.h"

#include <SD.h>

#include "board/Fefo35Board.h"

namespace fefo {

bool StorageService::begin() {
  spi_.begin(board::kSdClock, board::kSdMiso, board::kSdMosi, board::kSdCs);
  available_ = SD.begin(board::kSdCs, spi_, board::kSdFrequencyHz);

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

