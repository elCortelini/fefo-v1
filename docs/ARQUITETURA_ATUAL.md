# Arquitetura atual do FEFO

## Visão geral

```text
Google Drive             Celular Android                    FEFO/CYD
catalog.json ─HTTP──> Catálogo do app ─BLE (controle)──> AppController
áudio/face/bin ─HTTP─> armazenamento temporário             │
                              └─Wi-Fi FEFO temporário──────> SD / partição OTA
                                                               │
                                           áudio, display, LEDs, motor e faces
```

O BLE é o canal de descoberta, controle e sincronização. Arquivos grandes não passam pelo BLE: o aplicativo os baixa pela internet, pede ao FEFO que abra um ponto de acesso temporário e transfere por HTTP local. O FEFO não precisa de internet.

## Hardware suportado

- ESP32 na placa CYD de 3,5", display ILI9488 480×320.
- Display SPI: MISO 12, MOSI 13, CLK 14, CS 15, DC 2, backlight 27.
- microSD SPI: CS 5, MOSI 23, MISO 19, CLK 18, até 20 MHz.
- áudio DAC interno no GPIO 26 e amplificador da placa.
- 15 NeoPixels no GPIO 22.
- motor no GPIO 21.
- microfone no GPIO 35; sensor de luz no GPIO 34.
- RGB discreto nos GPIOs 17, 4 e 16.
- watchdog de 8 segundos; volume limitado pelo firmware a 75%.

Os valores canônicos estão em `include/board/Fefo35Board.h` e `platformio.ini`.

## Firmware

Entrada: `src/main.cpp`. Coordenação: `src/app/AppController.cpp`.

| Serviço | Responsabilidade |
|---|---|
| `BleService` | Nordic UART, advertising, recepção de comandos e notificações. |
| `StorageService` | Montagem do SD, diretórios, inventário e espaço. |
| `AudioService` | Leitura WAV e saída contínua no DAC sem bloquear o restante. |
| `DisplayService` | Painel BLE, status, progresso de transferência e faces. |
| `LedService` | padrões e intensidade dos NeoPixels. |
| `VibrationService` | padrões do motor. |
| `PanicService` | coordenação imediata de sirene, LEDs e motor. |
| `WifiTransferService` | AP temporário, HTTP de arquivos e OTA. |
| `UpdateService` | escrita e validação da partição OTA. |
| `DiagnosticsService` | diagnóstico serial e estado técnico. |

Configuração persistente fica em `/sys/c/config.txt`. O firmware reconstrói o inventário real do SD e o envia ao app; o arquivo `/fefo.json` fornece títulos e grupos amigáveis.

## Aplicativo

O app Flutter está em `app_android/`. `BluetoothManager` concentra conexão, protocolo, estado do FEFO, inventário e orquestração Wi-Fi. `MainActivity.kt` contém a integração nativa exigida para associar o Android à rede temporária do equipamento.

Fluxo principal:

1. tela inicial e busca BLE;
2. conexão ao nome `FEFO_BLE_Vnnn`;
3. `APP SYNC` e `CATALOG GET`;
4. montagem dos menus a partir dos áudios realmente instalados;
5. controles por BLE;
6. catálogo remoto para novas instalações e OTA;
7. Wi-Fi temporário somente quando houver transferência.

Menus ativos: pânico, Jukebox do Fefo e grupos dinâmicos, Catálogo Online, Faces do Fefo, Luzes terapêuticas, Vibrações e Quem é o Fefo.

## Dados e catálogos

Há dois JSONs com propósitos diferentes:

- `repository/catalog.json`: oferta online, URLs, firmware e todos os itens publicáveis;
- `sdcard/fefo.json`: metadados do conteúdo preparado/instalado, sem depender de internet.

Campos principais de conteúdo:

```json
{
  "id": "au001",
  "titulo": "AS CORES",
  "menu": "Jukebox do Fefo",
  "arquivo": "/usr/a/a0001.wav",
  "tamanho": 3765156,
  "checksum": "sha256...",
  "tipo": "audio",
  "url": "https://..."
}
```

O campo `menu` define em qual menu o áudio aparece. O nome físico curto reduz complexidade no firmware; o título amigável fica no JSON.

## Formatos

- áudio: WAV PCM, mono, 16 bits, 22.050 Hz;
- face: RAW RGB565 little-endian, exatamente 480×320, 307.200 bytes;
- firmware OTA: `.bin` compatível com a placa e a tabela `partitions_fefo_ota.csv`;
- checksums do repositório: SHA-256.

## Rede temporária

O FEFO cria `FEFO_WIFI_xxxx`, desliga o BLE para liberar memória e atende no endereço local `192.168.4.1`. O Android se associa programaticamente, transfere os itens, finaliza a sessão e o FEFO reinicia. Após reiniciar, o app volta a se conectar por BLE e obtém um novo inventário. Desde a v070 existe somente este fluxo `WIFI PUSH`; o antigo `WIFI PULL` foi removido.

## Segurança atual

Há confirmação para exclusão, checksum de conteúdo e validação antes da OTA. Não há, porém, assinatura criptográfica do catálogo/firmware nem rollback completo. Portanto o sistema é adequado a protótipo controlado, não ainda a atualização pública hostil.
