#pragma once

namespace fefo {

// Reserva o limite arquitetural do modo pânico. Nenhum estímulo automático
// será executado até a política pedagógica e sensorial ser definida.
class PanicService {
 public:
  bool begin();
  bool enabled() const { return false; }
};

}  // namespace fefo

