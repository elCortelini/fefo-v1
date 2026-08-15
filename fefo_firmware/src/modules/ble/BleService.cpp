#include "modules/ble/BleService.h"

#include <Arduino.h>
#include <BLE2902.h>
#include <BLEAdvertising.h>
#include <BLECharacteristic.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <cctype>
#include <cstring>

#include "board/Fefo35Board.h"

namespace fefo {
namespace {

// Perfil definitivo: Nordic UART Service.
// RX recebe comandos do app; TX publica estado/respostas.
constexpr char kNordicServiceUuid[] = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
constexpr char kNordicRxUuid[] = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
constexpr char kNordicTxUuid[] = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
BleService* activeService = nullptr;

void trimCommand(char* text) {
  if (text == nullptr) return;

  char* start = text;
  while (*start != '\0' && isspace(static_cast<unsigned char>(*start))) {
    ++start;
  }

  if (start != text) {
    memmove(text, start, strlen(start) + 1);
  }

  char* end = text + strlen(text);
  while (end > text && isspace(static_cast<unsigned char>(end[-1]))) {
    *--end = '\0';
  }
}

bool startsWithIgnoreCase(const char* text, const char* prefix) {
  if (text == nullptr || prefix == nullptr) return false;
  while (*prefix != '\0') {
    if (*text == '\0') return false;
    const char a = static_cast<char>(tolower(static_cast<unsigned char>(*text)));
    const char b =
        static_cast<char>(tolower(static_cast<unsigned char>(*prefix)));
    if (a != b) return false;
    ++text;
    ++prefix;
  }
  return true;
}

bool isInternalBleValue(const char* command) {
  if (command == nullptr || command[0] == '\0') return false;

  // Valores de prontidao/eco/status nao sao comandos do usuario. O bug atual
  // vinha daqui: "RX:READY" era exibido na tela como se tivesse sido recebido
  // pelo celular.
  return strcasecmp(command, "RX:READY") == 0 ||
         strcasecmp(command, "RXREADY") == 0 ||
         strcasecmp(command, "READY") == 0 ||
         startsWithIgnoreCase(command, "FEFO UART READY") ||
         startsWithIgnoreCase(command, "STATE:") ||
         startsWithIgnoreCase(command, "OK ");
}

class ServerCallbacks final : public BLEServerCallbacks {
  void onConnect(BLEServer*) override {
    if (activeService != nullptr) activeService->setConnected(true);
    Serial.println("[BLE] Cliente conectado.");
  }

  void onDisconnect(BLEServer*) override {
    if (activeService != nullptr) activeService->setConnected(false);
    if (activeService == nullptr || !activeService->shuttingDown()) {
      BLEDevice::startAdvertising();
    }
    Serial.println("[BLE] Cliente desconectado; advertising reiniciado.");
  }
};

class CommandCallbacks final : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic,
               esp_ble_gatts_cb_param_t* param) override {
    if (activeService == nullptr || param == nullptr) return;
    if (param->write.len == 0 || param->write.value == nullptr) return;

    std::string payload(reinterpret_cast<char*>(param->write.value),
                        param->write.len);
    activeService->receiveCommand(payload);
  }

  void onWrite(BLECharacteristic* characteristic) override {
    if (activeService == nullptr) return;
    activeService->receiveCommand(characteristic->getValue());
  }
};

BLECharacteristic* addCommandCharacteristic(BLEService* service,
                                            const char* uuid,
                                            const char* initialValue = "") {
  BLECharacteristic* characteristic = service->createCharacteristic(
      uuid, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE |
                BLECharacteristic::PROPERTY_WRITE_NR |
                BLECharacteristic::PROPERTY_NOTIFY);
  characteristic->setValue(initialValue == nullptr ? "" : initialValue);
  characteristic->setCallbacks(new CommandCallbacks());
  characteristic->addDescriptor(new BLE2902());
  return characteristic;
}

BLECharacteristic* addStatusCharacteristic(BLEService* service,
                                           const char* uuid,
                                           const char* initialValue) {
  BLECharacteristic* characteristic = service->createCharacteristic(
      uuid, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  characteristic->setValue(initialValue == nullptr ? "" : initialValue);
  characteristic->addDescriptor(new BLE2902());
  return characteristic;
}
}  // namespace

bool BleService::begin() {
  activeService = this;
  shuttingDown_ = false;
  BLEDevice::init(board::kBleName);
  BLEDevice::setMTU(512);
  BLEDevice::setPower(ESP_PWR_LVL_P9);

  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService* nordicService = server->createService(kNordicServiceUuid);
  uartRxCharacteristic_ = addCommandCharacteristic(nordicService, kNordicRxUuid);
  uartTxCharacteristic_ =
      addStatusCharacteristic(nordicService, kNordicTxUuid, "FEFO BLE READY\r\n");
  nordicService->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(kNordicServiceUuid);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.printf("[BLE] Nordic UART iniciado como %s. MTU local solicitada: 512.\n",
                board::kBleName);
  return true;
}

void BleService::publishState(SystemState state) {
  if (uartTxCharacteristic_ == nullptr) return;
  String message = String("STATE:") + systemStateName(state) + "\r\n";
  uartTxCharacteristic_->setValue(message.c_str());
  if (connected_) uartTxCharacteristic_->notify();
}

void BleService::sendLine(const char* line) {
  if (uartTxCharacteristic_ == nullptr || line == nullptr) return;
  char message[240]{};
  strlcpy(message, line, sizeof(message));
  strlcat(message, "\r\n", sizeof(message));
  uartTxCharacteristic_->setValue(message);
  if (connected_) {
    uartTxCharacteristic_->notify();
    delay(12);
  }
}

void BleService::receiveCommand(const std::string& command) {
  char cleanedCommand[sizeof(pendingCommand_)]{};
  const size_t length = min(command.size(), sizeof(cleanedCommand) - 1);
  memcpy(cleanedCommand, command.data(), length);
  cleanedCommand[length] = '\0';
  trimCommand(cleanedCommand);

  if (cleanedCommand[0] == '\0' || isInternalBleValue(cleanedCommand)) {
    if (cleanedCommand[0] != '\0') {
      Serial.printf("[BLE] Ignorado valor sem comando: %s\n", cleanedCommand);
    }
    return;
  }

  portENTER_CRITICAL(&commandMux_);
  strlcpy(pendingCommand_, cleanedCommand, sizeof(pendingCommand_));
  commandPending_ = true;
  portEXIT_CRITICAL(&commandMux_);

  Serial.printf("[BLE] Comando recebido: %s\n", cleanedCommand);
  if (uartTxCharacteristic_ != nullptr) {
    uartTxCharacteristic_->setValue("OK CMD_RX\r\n");
    if (connected_) uartTxCharacteristic_->notify();
  }
}

bool BleService::takeCommand(char* output, size_t outputSize) {
  if (output == nullptr || outputSize == 0) return false;

  portENTER_CRITICAL(&commandMux_);
  if (commandPending_) {
    strlcpy(output, pendingCommand_, outputSize);
    pendingCommand_[0] = '\0';
    commandPending_ = false;
    portEXIT_CRITICAL(&commandMux_);
    return true;
  }
  portEXIT_CRITICAL(&commandMux_);

  return false;
}

void BleService::shutdown() {
  shuttingDown_ = true;
  connected_ = false;
  BLEDevice::deinit(true);
  uartRxCharacteristic_ = nullptr;
  uartTxCharacteristic_ = nullptr;
  Serial.println("[BLE] Desligado para liberar memoria ao Wi-Fi.");
}

}  // namespace fefo
