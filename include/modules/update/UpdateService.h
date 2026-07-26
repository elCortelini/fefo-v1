#pragma once

namespace fefo {

// Fronteira do futuro OTA BLE. Nenhuma gravação de flash é aceita na Fase 0.
class UpdateService {
 public:
  bool begin();
  bool acceptsTransfers() const { return false; }
};

}  // namespace fefo

