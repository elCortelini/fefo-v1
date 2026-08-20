#pragma once

#include <cstdint>

namespace fefo {

// Proprietário do motor. O MOSFET deve permanecer desligado durante boot,
// falhas, transferências e sempre que não houver padrão ativo.
class VibrationService {
 public:
  bool begin();
  void selfTest();
  // O módulo chamador fornece seu prazo, mas o driver sempre aplica também o
  // teto físico absoluto definido no perfil da placa.
  bool start(uint8_t duty, uint32_t maxDurationMs);
  bool startPattern(uint8_t pattern, uint32_t durationMs = 7000);
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
  uint32_t maxDurationMs_{0};
  uint8_t pattern_{0};
};

}  // namespace fefo
