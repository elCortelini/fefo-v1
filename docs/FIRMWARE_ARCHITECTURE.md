# Arquitetura do firmware FEFO

Firmware de referência: `0.0.47`  
Placa: CYD ESP32 3,5" 480x320

## Visão geral

O firmware é organizado em um controlador central e módulos de serviço.

```text
main.cpp
└── AppController
    ├── AudioService
    ├── BleService
    ├── DisplayService
    ├── LedService
    ├── MicrophoneService
    ├── PanicService
    ├── StorageService
    ├── UpdateService
    └── VibrationService
```

## Arquivos principais

```text
include/board/Fefo35Board.h
```

Centraliza pinos, dimensões, versão, nome BLE e constantes elétricas.

```text
src/app/AppController.cpp
```

Coordena boot, loop, comandos BLE, estados, SD, mídia, pânico, OTA e tela.

```text
src/modules/ble/
```

Implementa BLE estilo Nordic UART:

- RX: comandos do celular/app para o FEFO.
- TX: respostas/notificações do FEFO.

```text
src/modules/audio/
```

Reprodução WAV PCM mono de 16 bits (16/22,05/32 kHz) pelo GPIO 26 usando
I2S/DAC interno e tarefa própria.

```text
src/modules/display/
```

Renderização da tela 480x320, painel BLE, VU meter, playback e faces RAW.

```text
src/modules/leds/
```

Controle NeoPixel no GPIO 22, padrões e VU visual baseado no áudio.

```text
src/modules/microphone/
```

Leitura do MAX9814 no GPIO 35 e cálculo de nível.

```text
src/modules/panic/
```

Estado do modo pânico, acionamento por ruído, motor e sirene.

```text
src/modules/storage/
```

Montagem do microSD.

```text
src/modules/update/
```

OTA BLE real usando `Update`.

```text
src/modules/vibration/
```

Controle do motor no GPIO 21.

## Estrutura do SD

```text
/usr/a              áudios do usuário
/usr/f              faces do usuário
/sys/a              áudios internos
/sys/f              faces internas
/sys/c/config.txt   configuração
/sys/log/events.log logs
/sys/db/media.idx   índice de mídia
/sys/db/fefo.json   catálogo
```

## BLE

Serviço:

```text
6e400001-b5a3-f393-e0a9-e50e24dcca9e
```

RX/write:

```text
6e400002-b5a3-f393-e0a9-e50e24dcca9e
```

TX/notify:

```text
6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

## Comandos de entrada recomendados para app

Primeiro comando após conectar:

```text
APP SYNC
```

Comandos importantes:

```text
STATUS
LIST AUDIO
PLAY <audio>
PAUSE
RESUME
STOP
VOL <0-100>
BRILHO <0-100>
LED <1-10>
VIBRA <1-5>
FB <arquivo> <bytes>
FX <seq> <hex> <sum8>
FE
OTA STATUS
```

## Modo diagnóstico

```text
DIAG ON
```

Mantém tela fixa no painel BLE.

```text
DIAG OFF
```

Libera retorno ao modo normal/faces.

## Build

```powershell
.\.venv\Scripts\pio.exe run
```

## Upload serial

```powershell
.\.venv\Scripts\pio.exe run -t upload --upload-port COM7
```

## Estado atual

```text
FW: 0.0.47
BLE: FEFO_BLE_V047
RAM: 44.456 bytes = 13,6%
Flash: 1.320.589 bytes = 67,2%
```
