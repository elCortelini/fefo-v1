# Histórico de versões

## V0.0.3 — 27/07/2026 (checkpoint diagnóstico)

- checkpoint funcional V0.0.2 salvo no commit `3e7c138` e tag `v0.0.2`;
- checkpoint atual identificado pela tag de pré-versão `v0.0.3-diagnostic`;
- versão do firmware e nome BLE atualizados para `0.0.3` e `FEFO_V003`;
- política completa do modo pânico movida para `modules/panic`;
- criado `PanicConfig.h` com limiar, tempos, PWM e caminho de áudio futuro;
- removido o controlador intermediário `modules/noise`; sua máquina de estados
  passou a pertencer diretamente ao `PanicService`;
- `VibrationService` voltou a ser genérico e recebe duração por acionamento;
- criado `diagnostics/led_patterns`, sem BLE, SD, mic, touch, áudio ou motor;
- desativado o diagnóstico bit-bang automático no firmware principal; os testes
  do GPIO22 passam a ocorrer somente no laboratório isolado;
- adicionados cinco padrões LED de 2 segundos em loop infinito;
- TFT mostra nome, descrição, progresso e simulação numerada dos 15 LEDs;
- primeira rodada visual confirmou a tela, mas nenhum LED físico respondeu;
- diagnóstico ampliado para comparar Adafruit, FastLED, NeoPixelBus/I2S1, SPI
  codificado e bit-bang com cinco perfis de tempo;
- incluído teste HIGH/LOW do GPIO22, pulls internos desligados e drive mínimo
  durante a prova; o drive máximo é usado somente pelos transportes;
- firmware principal e diagnóstico compilados com sucesso;
- diagnóstico gravado na COM7 e ciclo 1→2→3→4→5→1 confirmado pelo Serial.

## V0.0.2 — 27/07/2026

- próxima etapa após o checkpoint de fundação;
- criada regra modular de resposta a ruído sustentado do MAX9814;
- limiar em mais de 16/20 barras por 2 segundos;
- motor mantido por 3 segundos após o ruído cessar;
- VU vermelho enquanto o motor está ativo;
- fluxo definido como modo pânico: ruído sustentado, vibração e sirene;
- limite total do modo pânico reduzido de 20 para 10 segundos;
- dois ciclos de acionamento e desligamento confirmados pelo log no hardware;
- criado diagnóstico NeoPixel independente do firmware principal;
- no Arduino 2.0.17/IDF 4, os NeoPixels falharam em 800 e 400 kHz;
- no Arduino 3.3.7/IDF 5, as duas fases falharam, mas a biblioteca ignorou a
  seleção de 400 kHz e transmitiu ambas em aproximadamente 800 kHz;
- transmissor direto sem RMT executou pelo Serial, mas a aprovação visual
  registrada inicialmente foi retirada após o teste dedicado da V0.0.3;
- sirene I2S/DMA não bloqueante de 650 a 1150 Hz ligada ao estado real do
  motor, com volume de 70% e envelope antiestalo;
- acionamento simultâneo de motor e sirene confirmado pelo log serial;
- `PanicService` passa a coordenar detector, vibração e áudio sem incorporar as
  implementações desses módulos;
- substituição futura da sirene por áudio do microSD registrada na arquitetura;
- sirene aprovada fisicamente pelo usuário; comandos BLE de diagnóstico e áudio
  futuro pelo microSD continuam no escopo.

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
