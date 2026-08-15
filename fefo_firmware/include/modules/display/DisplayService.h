#pragma once

#include <cstddef>

#include <TFT_eSPI.h>

#include "core/SystemState.h"

namespace fefo {

// Controla exclusivamente display e backlight usando a configuração TFT_eSPI
// comprovada pelo FEFO 190. Outros módulos nunca desenham diretamente na TFT.
class DisplayService {
 public:
  bool begin();
  void showSystemState(SystemState state, bool storageAvailable);
  void beginVuMeter(bool microphoneAvailable, uint16_t noiseFloorRms);
  void showVuMeter(uint8_t levelPercent, uint8_t peakPercent, uint16_t rms,
                   uint16_t bias, uint16_t peakToPeak, bool clipping,
                   bool motorActive);
  void showAudioPlayback(const char* filename, uint8_t progressPercent,
                         uint8_t volumePercent);
  void showWifiTransfer(const char* filename, uint32_t received,
                        uint32_t total);
  void showBleCommand(const char* command);
  void showBlePanel(bool connected, bool readyForCommand,
                    const char* lastCommand, uint32_t commandCount,
                    const char* lastResponse, uint32_t responseCount,
                    const char* const* audioFiles, size_t audioFileCount);
  // Exibe um arquivo de face (RGB565 raw 480x320) a partir do SD.
  // O caminho deve ser o caminho relativo usado pelo SD (por exemplo "sys/f/face01.bin").
  void showFaceFile(const char* path);
  bool available() const { return available_; }

 private:
  TFT_eSPI tft_;
  bool available_{false};
  bool vuMeterReady_{false};
  char transferFile_[64]{};
  uint8_t transferPercent_{255};
};

}  // namespace fefo
