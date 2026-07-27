# FEFO PET V0.0.3 — checkpoint de diagnóstico

Firmware modular do FEFO para ESP32, tela TFT SPI de 3,5 polegadas 480x320,
microSD, áudio integrado NS8002D, 15 NeoPixels, motor de vibração, microfone
MAX9814 e BLE.

A tag `v0.0.2` preserva o último firmware aprovado no protótipo, com VU, modo
pânico, motor e sirene. A tag de pré-versão `v0.0.3-diagnostic` preserva este
checkpoint diagnóstico; os LEDs continuam sem aprovação física e não são
declarados funcionais.

## Estado atual da V0.0.3

- toda a política do modo pânico foi concentrada em `modules/panic`;
- limiar, qualificação, liberação, duração máxima, PWM e caminho futuro do áudio
  ficam centralizados em `PanicConfig.h`;
- motor e áudio continuam como drivers independentes e reutilizáveis;
- o firmware principal mantém o diagnóstico legado de LEDs desabilitado;
- foi criado um laboratório isolado com TFT e cinco transportes no GPIO 22;
- Adafruit, FastLED, NeoPixelBus/I2S1, SPI codificado e bit-bang são comparados;
- cada transporte executa cinco padrões de dois segundos e o conjunto repete
  em loop infinito, sem reiniciar o ESP32;
- a tela identifica método, padrão, temporização e os 15 valores RGB esperados.

O diagnóstico está em `diagnostics/led_patterns`. O Serial confirmou uma volta
pelos cinco métodos e o início de uma segunda volta, inclusive nova
inicialização do I2S1, sem reset ou travamento. A placa conectada está executando
esse firmware de teste, não o firmware principal.

## Checkpoint V0.0.2

A V0.0.2 funcional pode ser restaurada pela tag `v0.0.2` ou pelo commit
`3e7c138`. Ela contém:

- MAX9814 e VU meter em tempo real;
- modo pânico acima de 80%, com qualificação de 2 segundos;
- vibração e sirene sincronizadas, com limite absoluto de 10 segundos;
- desligamento após 3 segundos em nível seguro e rearme protegido;
- transporte NeoPixel experimental no GPIO 22, ainda sem aprovação física;
- TFT, microSD e BLE funcionais.

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
  led_patterns/        laboratório de cinco drivers e cinco padrões da V0.0.3
docs/
  FASE_0.md            validações e pendências reais
  CHANGELOG.md         histórico de checkpoints
  FEFO_V0.0.1_ESPECIFICACAO.md
  FEFO_V0.0.3.md       arquitetura e teste de LEDs da versão atual
```

## Compilar

```powershell
.\.venv\Scripts\pio.exe run
```

Para compilar somente o teste isolado de LEDs:

```powershell
.\.venv\Scripts\pio.exe run --project-dir diagnostics\led_patterns
```

## Gravar e monitorar

```powershell
.\.venv\Scripts\pio.exe run --target upload --upload-port COM7
.\.venv\Scripts\pio.exe device monitor --port COM7
```

O backup integral da flash anterior está em `backup/cyd-original-4mb.bin` e é
ignorado pelo Git.

## Versão atual: v0.0.3

- Firmware principal documentado como `0.0.3`.
- BLE identificado como `FEFO_V003`.
- Esta versão é um checkpoint diagnóstico da Fase 0, com o modo pânico ativo e
  o teste isolado de NeoPixels mantido fora do firmware principal.
- A estratégia acertiva foi manter o firmware principal focado em:
  - `AppController` como orquestrador central;
  - `main.cpp` mínimo com apenas `setup()` e `loop()`;
  - perfil elétrico e constantes centralizados em `include/board/Fefo35Board.h`;
  - `PanicService` coordenando motor e áudio sem acoplamento eletrônico;
  - diagnóstico NeoPixel isolado em `diagnostics/led_patterns`.

## O que ainda precisa ser feito antes de partir para a Fase 1 prevista

- Confirmar se a ausência de resposta dos 15 NeoPixels em GPIO22 é causada por
  falha elétrica/hardware ou por transporte/protocolo.
- Validar a reprodução de áudio sem estalos e testar WAV longos a partir do
  microSD.
- Implementar a rotina de watchdog e `watchdogFeed()` para garantir recuperação
  de travamentos e safe mode.
- Formalizar os padrões de Fase 0 e registrar as decisões de design para
  arquitetura, comunicação, SD, BLE e LEDs.
- Criar ou completar o módulo de comunicação/OTA técnico, incluindo rota
  `/status` e proteção de sistema antes de considerar transição para Fase 1.
- Executar testes BLE prolongados, monitorar heap e confirmar estabilidade do
  firmware em operação contínua.
- Adicionar testes unitários e validações isoladas para `PanicService`, BLE,
  áudio, SD e display.
- Verificar o tamanho final do binário para garantir `Flash < 50%` e partições
  OTA OK.

> Esta lista define a transição segura para a Fase 1 prevista, mas pode ser
> ajustada conforme o resultado dos testes elétricos e dos ajustes de áudio.
