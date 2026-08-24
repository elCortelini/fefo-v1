#pragma once

#include <Arduino.h>

// Perfil elétrico único do protótipo FEFO 3,5".
// Nenhum módulo deve repetir números de GPIO fora deste arquivo.
namespace fefo::board {

inline constexpr char kBoardName[] = "FEFO-35-V0";
inline constexpr char kBleName[] = "FEFO_BLE_V1087";
inline constexpr char kFirmwareVersion[] = "1.087";
inline constexpr char kProtocolVersion[] = "0.1";

// TFT SPI ILI9488 480x320 validada no protótipo com a configuração funcional
// derivada do FEFO 190. O touch permanece separado e desabilitado nesta fase.
inline constexpr uint16_t kDisplayWidth = 480;
inline constexpr uint16_t kDisplayHeight = 320;
inline constexpr int kTftMiso = 12;
inline constexpr int kTftMosi = 13;
inline constexpr int kTftClock = 14;
inline constexpr int kTftCs = 15;
inline constexpr int kTftDc = 2;
inline constexpr int kTftReset = -1;
inline constexpr int kBacklight = 27;

// Touch desabilitado na Fase 0. O GPIO 36 (TP_IRQ) é utilizado para a leitura
// da bateria via divisor de tensão no ADC1.
inline constexpr int kTouchClock = 25;
inline constexpr int kTouchCs = 33;
inline constexpr int kTouchMosi = 32;
inline constexpr int kTouchMiso = 39;
inline constexpr int kTouchIrq = 36;
inline constexpr bool kTouchEnabled = false;
inline constexpr int kBatterySensor = 36;

// Cartão microSD no controlador HSPI, remapeado para a pinagem abaixo. O TFT
// usa o outro controlador SPI e pode operar sem reconfigurar este barramento.
inline constexpr int kSdCs = 5;
inline constexpr int kSdMosi = 23;
inline constexpr int kSdMiso = 19;
inline constexpr int kSdClock = 18;
inline constexpr uint32_t kSdFrequencyHz = 20000000;

// Atuadores e sensores externos/integrados.
inline constexpr int kAudioOutput = 26;
// Audio habilitado para comandos BLE. O teste automatico no boot permanece
// desligado para evitar reproducao inesperada ao reiniciar.
inline constexpr bool kAudioEnabled = true;
inline constexpr bool kAudioBootTestEnabled = false;
inline constexpr int kNeoPixel = 22;
inline constexpr uint16_t kNeoPixelCount = 35;
inline constexpr int kMotor = 21;
inline constexpr uint8_t kMotorPwmChannel = 7;
inline constexpr uint32_t kMotorPwmFrequencyHz = 5000;
inline constexpr uint8_t kMotorPwmResolutionBits = 8;
inline constexpr int kMicrophone = 35;
inline constexpr int kLightSensor = 34;
inline constexpr int kLedRed = 17;
inline constexpr int kLedGreen = 4;
inline constexpr int kLedBlue = 16;

// Proteções físicas independentes das regras de qualquer atividade. Mesmo que
// um módulo solicite outro valor, o driver nunca ultrapassará este teto.
inline constexpr uint32_t kMotorAbsoluteMaxDurationMs = 10000;
// Intervalo mínimo de repouso do motor entre dois acionamentos.
inline constexpr uint32_t kMotorCooldownMs = 2000;
inline constexpr uint8_t kVuSegmentCount = 20;
inline constexpr uint8_t kDefaultMaxVolumePercent = 100;

// Sirene gerada pelo DAC interno no GPIO 26. A frequência percorre o intervalo
// abaixo em subida e descida contínuas, produzindo o efeito de alerta sem usar
// arquivos de áudio do cartão. O limite de 75% protege o pequeno amplificador
// integrado e deixa margem para a rampa antiestalo.
inline constexpr uint32_t kAudioSampleRateHz = 16000;
inline constexpr uint16_t kSirenMinFrequencyHz = 650;
inline constexpr uint16_t kSirenMaxFrequencyHz = 1150;
inline constexpr uint16_t kSirenSweepHalfPeriodMs = 600;
inline constexpr uint8_t kSirenVolumePercent = kDefaultMaxVolumePercent;
inline constexpr uint16_t kSirenAttackMs = 120;
inline constexpr uint16_t kSirenReleaseMs = 60;

inline constexpr uint8_t kDefaultMaxLedBrightness = 76;
// O diagnóstico legado permanece disponível para comparação, mas fica
// desabilitado no firmware principal. Os ensaios de GPIO22 pertencem ao projeto
// isolado diagnostics/led_patterns.
inline constexpr bool kNeoPixelBitBangDiagnosticEnabled = false;
inline constexpr uint32_t kNeoPixelDiagnosticStepMs = 3000;

// Watchdog da aplicacao. Se o loop principal deixar de alimentar o watchdog por
// mais que este prazo, o ESP32 reinicia automaticamente.
inline constexpr uint32_t kWatchdogTimeoutSeconds = 8;
inline constexpr uint32_t kMicrophoneIdleEnableMs = 300000;

}  // namespace fefo::board
