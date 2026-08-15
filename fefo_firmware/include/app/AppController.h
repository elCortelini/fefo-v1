#pragma once

#include "core/SystemState.h"
#include "modules/audio/AudioService.h"
#include "modules/ble/BleService.h"
#include "modules/diagnostics/DiagnosticsService.h"
#include "modules/display/DisplayService.h"
#include "modules/leds/LedService.h"
#include "modules/microphone/MicrophoneService.h"
#include "modules/panic/PanicService.h"
#include "modules/storage/StorageService.h"
#include "modules/update/WifiTransferService.h"
#include "modules/vibration/VibrationService.h"

namespace fefo {

// Ponto único de composição e coordenação dos serviços do firmware.
class AppController {
 public:
  void begin();
  void update();

 private:
  void transitionTo(SystemState nextState);
  void beginWatchdog();
  void feedWatchdog();
  void handleBleCommand(const char* command);
  bool playAudioFromBleToken(const char* token);
  void sendBleLine(const char* line);
  void sendBleStatus();
  void sendBleAudioList();
  void sendBleFaceList();
  void sendBleTree();
  void sendBleTreeRecursive(const char* directory, int depth, uint16_t& linesSent);
  void sendBleHelp();
  bool handleConfigCommand(const char* command);
  void sendConfig();
  bool saveConfigToSd();
  bool loadConfigFromSd(bool report);
  bool applyConfigKeyValue(const char* key, const char* value, bool report);
  bool handleDiagCommand(const char* command);
  bool handlePanicCommand(const char* command);
  bool handleDeviceCommand(const char* command);
  bool handleLogCommand(const char* command);
  bool handleMediaCommand(const char* command);
  bool handleFileCommand(const char* command);
  bool handleAppCommand(const char* command);
  void sendAppCaps();
  void sendAppState();
  void sendAppSync();
  bool handleAdvancedPlayCommand(const char* command);
  void sendSdInfo();
  bool buildMediaIndex();
  bool buildCatalogJson();
  void logEvent(const char* event, const char* detail = nullptr);
  bool handleFaceCommand(const char* command);
  bool showFaceByToken(const char* token);
  bool handleModeCommand(const char* command);
  bool handleVolumeCommand(const char* command);
  bool handleSeekCommand(const char* command);
  bool handleBrightnessCommand(const char* command);
  bool handleLedPatternCommand(const char* command);
  bool handleVibrationCommand(const char* command);
  void updateBlePanel(bool force = false);
  void noteUserActivity();
  void updateIdleMicrophone(uint32_t nowMs);
  void activateMicrophone(uint32_t nowMs);
  void deactivateMicrophone();
  void updateFaces(uint32_t nowMs);
  void startAudioTestSequence();
  bool startNextAudioTest();
  static void handleWifiProgress(const char* path, uint32_t received,
                                 uint32_t total, void* context);

  SystemState state_{SystemState::kBoot};
  AudioService audio_;
  BleService ble_;
  DiagnosticsService diagnostics_;
  DisplayService display_;
  LedService leds_;
  MicrophoneService microphone_;
  PanicService panic_;
  StorageService storage_;
  WifiTransferService wifiTransfer_;
  VibrationService vibration_;
  bool microphoneReady_{false};
  bool microphoneActive_{false};
  uint32_t lastUserActivityMs_{0};
  uint32_t lastMicrophoneUpdateMs_{0};
  uint32_t lastMicrophoneLogMs_{0};
  uint8_t latestMicrophoneLevelPercent_{0};
  bool watchdogReady_{false};
  bool blePanelActive_{true};
  bool preferredFacesMode_{false};
  bool lastBleConnected_{false};
  uint32_t lastBlePanelUpdateMs_{0};
  uint32_t bleCommandCount_{0};
  uint32_t bleResponseCount_{0};
  char lastBleCommand_[160]{};
  char lastBleResponse_[160]{};
  char lastPlayError_[80]{};
  bool audioPaused_{false};
  char pausedAudioPath_[64]{};
  uint32_t pausedAudioOffset_{0};
  bool diagnosticMode_{true};
  bool audioLoop_{false};
  char deviceId_[32]{"FEFO_001"};
  char deviceName_[32]{"FEFO"};
  bool fileTransferOpen_{false};
  char fileTransferPath_[64]{};
  uint32_t fileTransferExpectedBytes_{0};
  uint32_t fileTransferReceivedBytes_{0};
  uint16_t fileTransferNextSeq_{0};
  char pendingDeletePath_[64]{};
  uint16_t pendingDeleteCode_{0};
  uint8_t manualVibrationPattern_{0};
  bool manualVibrationActive_{false};
  uint32_t manualVibrationStartedAtMs_{0};
  bool wifiPushScheduled_{false};
  uint32_t wifiPushAtMs_{0};

  static constexpr size_t kMaxAudioTestFiles = 96;
  static constexpr size_t kMaxAudioTestPathLength = 64;

  static constexpr size_t kMaxFaceFiles = 48;
  static constexpr size_t kMaxFacePathLength = 64;

  bool audioTestActive_{false};
  bool audioTestPlaybackPending_{false};
  size_t currentAudioIndex_{0};
  char audioTestFiles_[kMaxAudioTestFiles][kMaxAudioTestPathLength];
  size_t audioTestFileCount_{0};
  uint8_t lastAudioProgress_{255};
  uint32_t lastAudioDisplayMs_{0};
  char lastAudioFile_[kMaxAudioTestPathLength];
  char currentAudioPath_[kMaxAudioTestPathLength]{};

  // Faces display during audio test
  char faceFiles_[kMaxFaceFiles][kMaxFacePathLength];
  size_t faceFileCount_{0};
  size_t currentFaceIndex_{0};
  uint32_t lastFaceChangeMs_{0};
  static constexpr uint32_t kFaceDisplayMs = 3000;
  // Quando true, as faces são ciclada independentemente do estado de audioTest
  bool faceCyclingActive_{false};
  bool faceRandomLoop_{true};

  bool scanFaceFiles();
  bool collectFaceFiles(const char* directory, int depth = 0);
  bool addFaceFile(const char* path);

  bool scanAudioTestFiles();
  bool addAudioTestFile(const char* path);
  bool collectAudioTestFiles(const char* directory, int depth = 0);
};

}  // namespace fefo
