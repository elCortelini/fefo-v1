# Histórico de versões

## V0.0.2 — em desenvolvimento

- próxima etapa após o checkpoint de fundação;
- escopo inicial: NeoPixels, áudio sem estalos e comandos BLE de diagnóstico.

## V0.0.1 — 26/07/2026

Primeiro checkpoint funcional da nova arquitetura FEFO.

### Validado

- estrutura PlatformIO modular;
- ESP32, flash, partições OTA e boot seguro;
- TFT ILI9488 480x320;
- microSD e estrutura compacta de arquivos;
- BLE NimBLE com conexão;
- motor no GPIO 21;
- MAX9814 no GPIO 35 e VU meter;
- silêncio seguro do NS8002D quando inativo.

### Pendências conhecidas

- NeoPixels no GPIO 22 sem resposta no firmware novo;
- áudio reproduz, mas apresenta estalos;
- touch, pânico e OTA BLE ainda desabilitados.
