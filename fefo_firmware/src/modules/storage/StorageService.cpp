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

  if (!initializeFefoLayout()) {
    Serial.println("[STORAGE] Falha ao preparar a estrutura de pastas do FEFO.");
    available_ = false;
    return false;
  }

  capacityBytes_ = SD.totalBytes();
  usedBytes_ = SD.usedBytes();
  Serial.printf("[STORAGE] microSD OK: %llu MB total, %llu MB usados.\n",
                capacityBytes_ / (1024ULL * 1024ULL),
                usedBytes_ / (1024ULL * 1024ULL));
  return true;
}

bool StorageService::initializeFefoLayout() {
  // Diretórios oficiais. A operação é idempotente: existentes permanecem
  // intactos e cartões com arquivos aleatórios não são apagados.
  static constexpr const char* kDirectories[] = {
      "/sys", "/sys/c", "/sys/db", "/sys/log", "/usr", "/usr/a",
      "/usr/f", "/usr/c",
  };

  for (const char* directory : kDirectories) {
    if (!SD.exists(directory) && !SD.mkdir(directory)) {
      Serial.printf("[STORAGE] Nao foi possivel criar %s.\n", directory);
      return false;
    }
  }

  // O marcador permite diagnosticar a preparação sem manter estado em RAM.
  // Ele também serve como identificação da versão da estrutura do cartão.
  constexpr const char* kMarkerPath = "/sys/fefo_layout.dat";
  if (!SD.exists(kMarkerPath)) {
    File marker = SD.open(kMarkerPath, FILE_WRITE);
    if (!marker) return false;
    marker.println("FEFO_LAYOUT=1");
    marker.println("PATHS=/usr/a,/usr/f,/usr/c,/sys/c,/sys/db,/sys/log");
    marker.close();
  }

  Serial.println("[STORAGE] Estrutura FEFO verificada/preparada.");
  return true;
}

}  // namespace fefo
