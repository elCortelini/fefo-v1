#include "modules/ble/BleService.h"

#include <Arduino.h>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

constexpr char kServiceUuid[] = "7b4e0001-6f4f-4645-464f-000000000001";
constexpr char kDeviceInfoUuid[] = "7b4e0001-6f4f-4645-464f-000000000002";
constexpr char kStatusUuid[] = "7b4e0001-6f4f-4645-464f-000000000003";
BleService* activeService = nullptr;

class ServerCallbacks final : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*) override {
    if (activeService != nullptr) activeService->setConnected(true);
    Serial.println("[BLE] Cliente conectado.");
  }

  void onDisconnect(NimBLEServer*) override {
    if (activeService != nullptr) activeService->setConnected(false);
    NimBLEDevice::startAdvertising();
    Serial.println("[BLE] Cliente desconectado; advertising reiniciado.");
  }
};

}  // namespace

bool BleService::begin() {
  activeService = this;
  NimBLEDevice::init(board::kBleName);

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService* service = server->createService(kServiceUuid);

  NimBLECharacteristic* deviceInfo = service->createCharacteristic(
      kDeviceInfoUuid, NIMBLE_PROPERTY::READ);
  String info = String("board=") + board::kBoardName + ";fw=" +
                board::kFirmwareVersion + ";proto=" + board::kProtocolVersion;
  deviceInfo->setValue(info.c_str());

  statusCharacteristic_ = service->createCharacteristic(
      kStatusUuid, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  statusCharacteristic_->setValue("BOOT");
  service->start();

  NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(kServiceUuid);
  advertising->setScanResponse(true);
  NimBLEDevice::startAdvertising();
  Serial.printf("[BLE] Advertising iniciado como %s.\n", board::kBleName);
  return true;
}

void BleService::publishState(SystemState state) {
  if (statusCharacteristic_ == nullptr) return;
  statusCharacteristic_->setValue(systemStateName(state));
  if (connected_) statusCharacteristic_->notify();
}

}  // namespace fefo

