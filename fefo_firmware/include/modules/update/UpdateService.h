#pragma once

#include <cstddef>
#include <cstdint>

namespace fefo {

// Servico de OTA por BLE. O transporte fica no AppController; este modulo cuida
// da escrita segura na particao OTA e da validacao final antes do reboot.
class UpdateService {
 public:
  bool begin();
  bool acceptsTransfers() const { return true; }
  bool start(uint32_t expectedSize, const char* md5 = nullptr);
  size_t write(uint8_t* data, size_t length);
  bool finish();
  void cancel();
  const char* lastError() const { return lastError_; }
  bool active() const { return active_; }
  bool readyToReboot() const { return readyToReboot_; }
  uint32_t expectedSize() const { return expectedSize_; }
  uint32_t receivedSize() const { return receivedSize_; }

 private:
  void setError(const char* message);

  bool active_{false};
  bool readyToReboot_{false};
  uint32_t expectedSize_{0};
  uint32_t receivedSize_{0};
  char lastError_[72]{};
};

}  // namespace fefo
