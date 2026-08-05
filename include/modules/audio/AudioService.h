#pragma once

#include <atomic>
#include <cstdint>

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

#include "board/Fefo35Board.h"

namespace fefo {

// Proprietário exclusivo do I2S0 e do DAC2/GPIO 26. A tarefa dedicada mantém a
// fila DMA alimentada sem bloquear o VU meter, o BLE ou os prazos do motor.
class AudioService {
 public:
  bool begin();
  void selfTest();
  void setSirenActive(bool active);
  void stop();
  bool playWavFile(const char* path);
  bool playWavFileFrom(const char* path, uint32_t offsetBytes);
  void stopPlayback();
  bool storageBusy() const {
    return playbackRequested_.load(std::memory_order_relaxed) ||
           playbackActive_.load(std::memory_order_relaxed) ||
           stopPlaybackRequested_.load(std::memory_order_relaxed);
  }
  bool playbackActive() const {
    return playbackActive_.load(std::memory_order_relaxed);
  }
  uint32_t playbackPosition() const {
    return playbackPosition_.load(std::memory_order_relaxed);
  }
  uint32_t playbackSize() const {
    return playbackSize_.load(std::memory_order_relaxed);
  }
  uint8_t playbackLevelPercent() const {
    return playbackLevelPercent_.load(std::memory_order_relaxed);
  }
  const char* playbackFileName() const { return playbackFileName_; }
  uint8_t volumePercent() const {
    return volumePercent_.load(std::memory_order_relaxed);
  }
  void setVolumePercent(uint8_t percent);

  bool ready() const { return ready_.load(std::memory_order_relaxed); }
  bool sirenActive() const {
    return sirenRequested_.load(std::memory_order_relaxed);
  }
  bool sirenAudible() const {
    return sirenAudible_.load(std::memory_order_relaxed);
  }
  void setSirenLocked(bool locked) { sirenLocked_.store(locked, std::memory_order_relaxed); }
  bool sirenLocked() const { return sirenLocked_.load(std::memory_order_relaxed); }

 private:
  bool beginDma();
  void endDma();
  static void audioTaskEntry(void* context);
  void audioTask();

  std::atomic<bool> ready_{false};
  std::atomic<bool> sirenRequested_{false};
  std::atomic<bool> sirenAudible_{false};
  std::atomic<bool> playbackRequested_{false};
  std::atomic<bool> playbackActive_{false};
  std::atomic<bool> stopPlaybackRequested_{false};
  std::atomic<uint8_t> volumePercent_{board::kDefaultMaxVolumePercent};
  char playbackPath_[128]{};
  char playbackFileName_[64]{};
  std::atomic<uint32_t> requestedPlaybackOffset_{0};
  std::atomic<uint32_t> playbackPosition_{0};
  std::atomic<uint32_t> playbackSize_{0};
  std::atomic<uint8_t> playbackLevelPercent_{0};
  TaskHandle_t taskHandle_{nullptr};
  bool unavailableWarningShown_{false};
  std::atomic<bool> sirenLocked_{false};
};

}  // namespace fefo
