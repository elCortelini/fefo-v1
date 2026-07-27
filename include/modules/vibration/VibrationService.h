#pragma once

#include <cstdint>

namespace fefo {

// Proprietário do motor. O MOSFET deve permanecer desligado durante boot,
// falhas, transferências e sempre que não houver padrão ativo.
class VibrationService {
 public:
  bool begin();
  void selfTest();
  bool start(uint8_t duty);
  void update(uint32_t nowMs);
  void stop();
  bool active() const { return active_; }
  bool safetyLockout() const { return safetyLockout_; }
  void clearSafetyLockout();

 private:
  void writeOutput(uint8_t duty);

  bool initialized_{false};
  bool active_{false};
  bool safetyLockout_{false};
  uint32_t startedAtMs_{0};
  uint32_t stoppedAtMs_{0};
};

}  // namespace fefo
