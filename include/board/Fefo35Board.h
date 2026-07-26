#pragma once

#include <Arduino.h>

// Perfil elétrico único do protótipo FEFO 3,5".
// Nenhum módulo deve repetir números de GPIO fora deste arquivo.
namespace fefo::board {

inline constexpr char kBoardName[] = "FEFO-35-V0";
inline constexpr char kBleName[] = "FEFO_V001";
inline constexpr char kFirmwareVersion[] = "0.0.1";
inline constexpr char kProtocolVersion[] = "0.1";

// TFT SPI 480x320. O driver exato será importado da configuração funcional
// usada pelo FEFO 190 antes de habilitar a renderização nesta base.
inline constexpr uint16_t kDisplayWidth = 480;
inline constexpr uint16_t kDisplayHeight = 320;
inline constexpr int kTftMiso = 12;
inline constexpr int kTftMosi = 13;
inline constexpr int kTftClock = 14;
inline constexpr int kTftCs = 15;
inline constexpr int kTftDc = 2;
inline constexpr int kTftReset = -1;
inline constexpr int kBacklight = 27;

// Touch desabilitado na Fase 0. Os GPIOs 21 e 22 ficam reservados
// exclusivamente aos atuadores externos, conforme a montagem do FEFO 190.
inline constexpr int kTouchClock = 25;
inline constexpr int kTouchCs = 33;
inline constexpr int kTouchMosi = 32;
inline constexpr int kTouchMiso = 39;
inline constexpr int kTouchIrq = 36;
inline constexpr bool kTouchEnabled = false;

// Cartão microSD em VSPI.
inline constexpr int kSdCs = 5;
inline constexpr int kSdMosi = 23;
inline constexpr int kSdMiso = 19;
inline constexpr int kSdClock = 18;
inline constexpr uint32_t kSdFrequencyHz = 20000000;

// Atuadores e sensores externos/integrados.
inline constexpr int kAudioOutput = 26;
inline constexpr int kNeoPixel = 22;
inline constexpr uint16_t kNeoPixelCount = 15;
inline constexpr int kMotor = 21;
inline constexpr uint8_t kMotorPwmChannel = 7;
inline constexpr uint32_t kMotorPwmFrequencyHz = 5000;
inline constexpr uint8_t kMotorPwmResolutionBits = 8;
inline constexpr int kMicrophone = 35;
inline constexpr int kLightSensor = 34;
inline constexpr int kLedRed = 17;
inline constexpr int kLedGreen = 4;
inline constexpr int kLedBlue = 16;

// Limites físicos obrigatórios, compartilhados pelos módulos de segurança.
inline constexpr uint32_t kMotorMaxDurationMs = 20000;
inline constexpr uint32_t kMotorCooldownMs = 2000;
inline constexpr uint8_t kDefaultMaxVolumePercent = 70;
inline constexpr uint8_t kDefaultMaxLedBrightness = 76;

}  // namespace fefo::board
