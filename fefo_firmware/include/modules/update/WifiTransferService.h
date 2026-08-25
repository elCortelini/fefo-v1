#pragma once

#include <Arduino.h>
#include <WiFiServer.h>

namespace fefo {

class WifiTransferService {
 public:
  using ProgressCallback = void (*)(const char* path, uint32_t received,
                                    uint32_t total, void* context);

  void setProgressCallback(ProgressCallback callback, void* context) {
    progressCallback_ = callback;
    progressContext_ = context;
  }
  bool configurePush();
  bool runPushServer();
  const char* ssid() const { return apSsid_; }
  const char* password() const { return apPassword_; }
  const char* token() const { return apToken_; }
  const char* lastError() const { return lastError_; }

 private:
  bool validPath(const char* path) const;
  bool ensureParent(const char* path);
  void setError(const char* error);
  void handlePushClient(WiFiClient& client, bool& finished,
                        bool& transferStarted);
  void handleFirmwareUpload(WiFiClient& client, uint32_t contentLength,
                            const char* expectedSha, bool& transferStarted);
  void reply(WiFiClient& client, int status, const char* message);

  char lastError_[80]{};
  WiFiServer server_{80};
  char apSsid_[32]{};
  char apPassword_[20]{};
  char apToken_[24]{};
  ProgressCallback progressCallback_{nullptr};
  void* progressContext_{nullptr};
  uint8_t lastProgressPercent_{255};
};

}  // namespace fefo
