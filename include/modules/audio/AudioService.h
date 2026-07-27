#pragma once

#include <atomic>
#include <cstdint>

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

namespace fefo {

// Proprietário exclusivo do I2S0 e do DAC2/GPIO 26. A tarefa dedicada mantém a
// fila DMA alimentada sem bloquear o VU meter, o BLE ou os prazos do motor.
class AudioService {
 public:
  bool begin();
  void selfTest();
  void setSirenActive(bool active);
  void stop();

  bool ready() const { return ready_.load(std::memory_order_relaxed); }
  bool sirenActive() const {
    return sirenRequested_.load(std::memory_order_relaxed);
  }
  bool sirenAudible() const {
    return sirenAudible_.load(std::memory_order_relaxed);
  }

 private:
  bool beginDma();
  void endDma();
  static void audioTaskEntry(void* context);
  void audioTask();

  std::atomic<bool> ready_{false};
  std::atomic<bool> sirenRequested_{false};
  std::atomic<bool> sirenAudible_{false};
  TaskHandle_t taskHandle_{nullptr};
  bool unavailableWarningShown_{false};
};

}  // namespace fefo
