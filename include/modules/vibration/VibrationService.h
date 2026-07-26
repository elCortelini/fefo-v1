#pragma once

namespace fefo {

// Proprietário do motor. O MOSFET deve permanecer desligado durante boot,
// falhas, transferências e sempre que não houver padrão ativo.
class VibrationService {
 public:
  bool begin();
  void selfTest();
  void stop();
};

}  // namespace fefo
