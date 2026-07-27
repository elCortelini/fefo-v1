# FEFO V0.0.3 — checkpoint diagnóstico do módulo pânico e dos LEDs

## Ponto de partida recuperável

A versão anterior foi preservada antes das mudanças:

- commit `3e7c138`;
- tag `v0.0.2`;
- firmware `0.0.2`;
- TFT, SD, BLE, MAX9814, motor, vibração e sirene validados.

Os LEDs não integram a lista de hardware aprovado. A confirmação atual mostrou
a TFT simulando corretamente os efeitos, mas a fita permaneceu apagada.
O diagnóstico automático legado está desativado no firmware principal; somente
`diagnostics/led_patterns` controla GPIO22 durante os ensaios desta versão.

## Módulo pânico

Toda a política configurável está em
`include/modules/panic/PanicConfig.h`:

| Parâmetro | Valor atual |
|---|---:|
| Limiar | estritamente acima de 80% |
| Barras necessárias | mais de 16/20 |
| Qualificação | 2.000 ms contínuos |
| Liberação após silêncio | 3.000 ms |
| Duração máxima | 10.000 ms |
| PWM do motor | 150/255 |
| Áudio futuro | `/sys/a/panic.wav` |

`PanicService` possui a máquina de estados e coordena `VibrationService` e
`AudioService`. O antigo `NoiseResponseController` foi absorvido por ele. O
driver do motor continua genérico, recebe duty e duração por acionamento e
sempre respeita o teto físico de dez segundos.

## Revisão da falha dos LEDs

Os pontos abaixo foram confirmados no código e no histórico:

- GPIO correto: 22;
- fita física: 15 LEDs;
- protocolo usado no FEFO 190: GRB/800 kHz;
- nenhum outro módulo do diagnóstico usa GPIO22;
- TFT, motor, áudio, SD, BLE, Wi-Fi, touch e microfone não disputam o pino;
- ordem RGB/GRB incorreta mudaria cores, mas não explicaria escuridão total;
- usar 15 ou 35 posições lógicas não impediria o primeiro LED de acender.

O registro anterior de que o bit-bang teria sido aprovado visualmente foi
retirado. A Serial havia comprovado apenas a execução do código; o teste dedicado
mostrou que a fita física continuou apagada.

## Laboratório `diagnostics/led_patterns`

O laboratório começa com uma prova local usando a menor capacidade de drive:

1. GPIO22 em HIGH por dois segundos;
2. GPIO22 em LOW por dois segundos;
3. bloqueio de todos os drivers se a leitura local não for `HIGH=1/LOW=0`.

O resultado local não testa continuidade. A tela manda medir aproximadamente
3,3 V e 0 V tanto no pino da placa quanto no DIN do primeiro LED.
Essa capacidade de drive não é limitador de corrente nem proteção contra curto;
o ensaio deve usar resistor série físico de 220–470 ohms. A janela ocorre apenas
uma vez no boot e deve ser repetida por reset com o multímetro já conectado.

Depois são executados cinco transportes:

| Método | Configuração |
|---:|---|
| 1 | Adafruit NeoPixel 1.15.2, configuração FEFO 190, core 2.0.17, 35 pixels lógicos, GRB/800 kHz, brilho 76 |
| 2 | FastLED, WS2812B, 15 pixels, GRB, brilho 80 |
| 3 | NeoPixelBus 2.8.4 por I2S1/DMA |
| 4 | HSPI 2,4 MHz com codificação `0=100` e `1=110` |
| 5 | GPIO direto com cinco perfis entre 833 kHz, 800 kHz, SK6812 e 400 kHz |

Cada método executa, por dois segundos cada, pisca branco, vermelho/azul,
corrida verde, expansão amarela e arco-íris. O mesmo vetor lógico alimenta a TFT
e o transporte físico. A prévia apenas amplifica o brilho para ficar legível.

Os transportes são liberados entre testes:

- o NeoPixelBus espera o DMA terminar e destrói o I2S1;
- o SPI envia OFF, encerra o HSPI e libera o MOSI;
- o bit-bang apaga usando a mesma temporização que estava ativa;
- o GPIO é desconectado da matriz e retorna a LOW antes do próximo método;
- o ciclo recomeça sem reiniciar o ESP32, evitando flutuação do motor e estalos.

## Validação executada em 27/07/2026

| Verificação | Resultado |
|---|---|
| Firmware principal V0.0.3 | compilação aprovada |
| RAM do firmware principal | 37.272 bytes / 11,4% |
| Flash do firmware principal | 734.165 bytes / 37,3% |
| Laboratório multi-driver | compilação aprovada |
| RAM do laboratório | 30.680 bytes / 9,4% |
| Flash do laboratório | 756.489 bytes / 57,7% |
| Upload CH340 / COM7 | aprovado |
| Prova local GPIO22 | HIGH=1 e LOW=0 |
| Cinco métodos × cinco padrões | uma volta confirmada pela Serial |
| Repetição sem reset | aprovada |
| Segunda inicialização do I2S1 | aprovada |
| Exceção, reset ou travamento | não observado |
| Resposta física da fita | aguardando observação do usuário |

## Próxima decisão

Se nenhum método acender a fita, a hipótese principal deixa de ser biblioteca ou
ordem de bytes. Os testes seguintes serão elétricos:

1. medir 0/3,3 V no GPIO22 e no DIN durante a prova lenta;
2. confirmar que o fio entra em `DIN`, seguindo a seta para `DOUT`;
3. testar um primeiro pixel conhecido e testar a fita em outro controlador;
4. usar buffer `74AHCT125` ou `74AHCT245` alimentado em 5 V, com resistor série
   de 220–470 ohms e GND comum;
5. verificar o primeiro LED, pois sua falha interrompe toda a cadeia.

Antes de mexer em DIN/DOUT, todas as fontes devem ser desligadas. A fita precisa
estar alimentada com GND comum antes de receber HIGH, nunca pode devolver 5 V ao
GPIO22 e deve preferencialmente ter 470–1.000 µF entre 5 V e GND na entrada. A
medição lenta no DIN verifica continuidade, não os pulsos nem o limiar lógico;
isso exige osciloscópio/analisador ou o buffer AHCT.

O motor também precisa de pull-down físico no gate do MOSFET, pois o software
somente garante GPIO21 LOW depois que o ESP32 começa a executar o `setup()`.

## Comandos

```powershell
.\.venv\Scripts\pio.exe run --project-dir diagnostics\led_patterns
.\.venv\Scripts\pio.exe run --project-dir diagnostics\led_patterns --target upload --upload-port COM7
.\.venv\Scripts\pio.exe device monitor --port COM7 --baud 115200
```
