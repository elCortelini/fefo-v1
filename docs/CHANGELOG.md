# Histórico de versões

## V0.0.2 — em desenvolvimento

- próxima etapa após o checkpoint de fundação;
- criada regra modular de resposta a ruído sustentado do MAX9814;
- limiar em mais de 16/20 barras por 2 segundos;
- motor mantido por 3 segundos após o ruído cessar;
- VU vermelho enquanto o motor está ativo;
- fluxo definido como modo pânico: ruído sustentado, vibração e sirene;
- limite total do modo pânico reduzido de 20 para 10 segundos;
- dois ciclos de acionamento e desligamento confirmados pelo log no hardware;
- criado diagnóstico NeoPixel independente do firmware principal;
- NeoPixels falharam em 800 e 400 kHz tanto no Arduino 2.0.17/IDF 4 quanto no
  Arduino 3.3.7/IDF 5;
- transmissor direto sem RMT recuperou visualmente os 15 LEDs no GPIO 22;
- sirene I2S/DMA não bloqueante de 650 a 1150 Hz ligada ao estado real do
  motor, com volume de 70% e envelope antiestalo;
- acionamento simultâneo de motor e sirene confirmado pelo log serial;
- `PanicService` passa a coordenar detector, vibração e áudio sem incorporar as
  implementações desses módulos;
- substituição futura da sirene por áudio do microSD registrada na arquitetura;
- validação de estalos, realimentação acústica e comandos BLE de diagnóstico
  continuam no escopo.

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
