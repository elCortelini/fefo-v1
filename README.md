# FEFO PET V0.0.2 — em desenvolvimento

Firmware modular do FEFO para ESP32, tela TFT SPI de 3,5 polegadas 480x320,
microSD, áudio integrado NS8002D, 15 NeoPixels, motor de vibração, microfone
MAX9814 e BLE.

A tag `v0.0.1` preserva o checkpoint funcional da Fase 0. O código na branch
`main` inicia agora o desenvolvimento da V0.0.2.

## Estado atual da V0.0.2

- ruído acima de 16 das 20 barras por 2 segundos aciona o motor;
- o motor desliga 3 segundos depois de o nível retornar ao limite seguro;
- o VU fica vermelho durante a vibração;
- este conjunto forma o modo pânico: detecção acústica, vibração e sirene;
- o modo pânico possui limite total de 10 segundos e rearme seguro;
- uma sirene DMA de 650 a 1150 Hz acompanha exclusivamente o acionamento do
  motor, com volume limitado a 70% e rampas antiestalo;
- os 15 NeoPixels funcionam pelo transmissor direto do GPIO 22, mantendo TFT,
  VU, BLE, SD, microfone e motor em execução.

Os testes isolados de 27/07/2026 não produziram luz com Adafruit NeoPixel
1.15.2 em nenhum dos backends RMT comparados. O teste integrado sem RMT acendeu
corretamente a sequência vermelho, verde, azul, branco e apagado, confirmando o
GPIO 22, a alimentação e os 15 LEDs. A falha ficou isolada no transporte RMT;
o transmissor direto permanece ativo enquanto é definida a abstração final.

Em uma versão futura, a sirene sintetizada do modo pânico será substituída por
um arquivo de áudio carregado do microSD, preservando a mesma interface modular.

## Checkpoint V0.0.1

A V0.0.1 estabelece uma base compilável e validada no protótipo físico:

- placa ESP32-D0WD-V3, 4 MB de flash e sem PSRAM;
- TFT ILI9488 em 480x320;
- microSD em barramento SPI dedicado;
- BLE NimBLE com advertising e conexão confirmados;
- motor via MOSFET no GPIO 21;
- MAX9814 no GPIO 35 com VU meter em tempo real;
- DAC/NS8002D no GPIO 26 em silêncio seguro quando inativo;
- perfil elétrico centralizado e módulos independentes;
- duas partições de aplicação preparadas para OTA futuro.

Pendências conhecidas deste checkpoint:

- os 15 NeoPixels no GPIO 22 não responderam no firmware novo, embora tenham
  funcionado no FEFO 190;
- a reprodução de áudio funciona, mas ainda apresenta estalos e precisa de
  investigação antes de entrar no fluxo normal;
- touch, pânico e OTA por BLE permanecem desabilitados.

## Estrutura

```text
include/
  app/                 contrato do controlador central
  board/               perfil elétrico FEFO 3,5
  core/                estados e tipos compartilhados
  modules/             contratos dos serviços
src/
  app/                 coordenação do firmware
  core/                máquina de estados
  modules/             implementações por periférico
sdcard/                modelo pronto para copiar ao cartão
examples/
  cyd_diagnostic/      diagnóstico de inventário preservado
diagnostics/
  led_isolated/        comparação reproduzível dos backends NeoPixel
docs/
  FASE_0.md            validações e pendências reais
  CHANGELOG.md         histórico de checkpoints
  FEFO_V0.0.1_ESPECIFICACAO.md
```

## Compilar

```powershell
.\.venv\Scripts\pio.exe run
```

## Gravar e monitorar

```powershell
.\.venv\Scripts\pio.exe run --target upload --upload-port COM7
.\.venv\Scripts\pio.exe device monitor --port COM7
```

O backup integral da flash anterior está em `backup/cyd-original-4mb.bin` e é
ignorado pelo Git.
