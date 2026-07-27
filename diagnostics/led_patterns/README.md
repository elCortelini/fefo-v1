# FEFO V0.0.3 — laboratório isolado do GPIO22 e dos LEDs

Este firmware compara cinco formas de controlar os 15 LEDs conectados ao
GPIO22. BLE, Wi-Fi, microSD, MAX9814, touch, motor e áudio não são inicializados.
GPIO21 e DAC26 permanecem em repouso e o CS do cartão fica em nível alto.

## Prova local do GPIO22

Antes dos drivers, a tela mostra duas fases de dois segundos:

1. `HIGH`: esperado aproximadamente 3,3 V;
2. `LOW`: esperado aproximadamente 0 V.

Essa prova usa drive mínimo e desliga apenas os pulls internos. O firmware lê o
próprio pad e só continua se obtiver `HIGH=1` e `LOW=0`. O resultado `PAD LOCAL
OK` não comprova cabo, DIN ou primeiro LED. A validação do caminho exige medir
externamente no pino da CYD e no DIN durante as duas fases.

A prova ocorre somente uma vez logo após o boot. Para medi-la, deixe o
multímetro conectado antes de resetar a CYD; um novo reset repete a janela. A
capacidade mínima de drive não protege o ESP32 contra curto e não substitui um
resistor físico.

### Preparação elétrica obrigatória

Antes de resetar ou energizar o conjunto:

1. desligue as fontes antes de alterar qualquer ligação;
2. confirme a entrada `DIN`, a alimentação de 5 V e o GND comum com a CYD;
3. use resistor série de 220–470 ohms entre GPIO22 e `DIN`;
4. confirme que nunca há 5 V chegando ao GPIO22;
5. não aplique o sinal com a fita sem alimentação, evitando alimentação
   parasita pelo pino de dados;
6. recomenda-se capacitor de 470–1.000 µF entre 5 V e GND na entrada da fita,
   respeitando sua polaridade.

O multímetro confirma apenas os níveis lentos e a continuidade em corrente
contínua. Pulsos de 400/800 kHz, tempo de subida e aceitação de 3,3 V por uma
fita alimentada em 5 V exigem osciloscópio/analisador lógico ou o ensaio com um
buffer `74AHCT125`/`74AHCT245` alimentado em 5 V.

## Cinco métodos

Cada método recebe o mesmo `RgbColor[15]` e executa os cinco padrões por dez
segundos. Ao final, seus periféricos são liberados e o ciclo recomeça sem reset.

| Método | Transporte testado |
|---:|---|
| 1 | Adafruit NeoPixel 1.15.2, configuração do FEFO 190: 35 pixels lógicos, GPIO22, GRB/800 kHz e brilho 76, sobre Arduino core 2.0.17 |
| 2 | FastLED, configuração do VU legado: WS2812B, 15 pixels, GPIO22, GRB e brilho 80 |
| 3 | NeoPixelBus 2.8.4 por I2S1/DMA, sem RMT |
| 4 | HSPI a 2,4 MHz: bit zero codificado como `100` e bit um como `110` |
| 5 | Escrita direta no GPIO com cinco perfis de temporização |

O método Adafruit repete a configuração do FEFO 190, mas este projeto
PlatformIO usa Arduino-ESP32 2.0.17. Portanto, ele não reproduz o backend do
core 3.3.7 usado pelo firmware antigo.

No build atual, FastLED informou pela Serial que selecionou seu controlador
genérico de fallback. Isso continua sendo útil como implementação de biblioteca
independente, mas não deve ser descrito como RMT.

A dependência é baixada pelo tag upstream `3.10.4`; um metadado interno desse
tag ainda informa `3.10.3`, motivo pelo qual o grafo do PlatformIO exibe o
número anterior. O código compilado corresponde ao conteúdo do tag `3.10.4`.

### Perfis do método 5

| Padrão | Temporização |
|---:|---|
| 1 | 800 kHz, T0H 400 ns e T1H 800 ns |
| 2 | 833 kHz, T0H 350 ns e T1H 700 ns |
| 3 | 800 kHz, T0H 300 ns e T1H 750 ns |
| 4 | perfil SK6812, T0H 300 ns e T1H 600 ns |
| 5 | 400 kHz, T0H 500 ns e T1H 1.200 ns |

O comando de apagar usa o mesmo perfil ativo. O latch fica em nível baixo por
800 µs para também atender controladores compatíveis com reset mais lento.

## Cinco padrões

Cada padrão dura dois segundos:

1. `PISCA BRANCO`;
2. `VERMELHO / AZUL`;
3. `CORRIDA VERDE`;
4. `EXPANSAO AMARELA`;
5. `ARCO-IRIS`.

Os canais ficam limitados a 64/255; o branco usa 48/255 por canal. Pela regra
conservadora de 60 mA por pixel em branco total, o maior padrão consome cerca
de 170 mA nos 15 LEDs; reserve pelo menos 200 mA além da margem da fonte.

A TFT mostra o número e o nome do método, seu backend, o padrão atual, os 15
pixels numerados e a contagem de ciclos completos. Ao observar alguma resposta
física, anote exatamente o método e o padrão mostrados.

## Estado da validação

- compilação: aprovada;
- RAM: 30.680 bytes, 9,4%;
- flash: 756.489 bytes, 57,7%;
- upload na COM7: aprovado;
- prova local do pad: `HIGH=1`, `LOW=0`;
- uma volta completa e reinício sem reset: aprovados pela Serial;
- segunda inicialização do NeoPixelBus/I2S1: aprovada pela Serial;
- resposta física da fita: aguardando observação do usuário.

## Comandos

Compilar:

```powershell
.\.venv\Scripts\pio.exe run --project-dir diagnostics\led_patterns
```

Gravar:

```powershell
.\.venv\Scripts\pio.exe run --project-dir diagnostics\led_patterns --target upload --upload-port COM7
```

Monitorar:

```powershell
.\.venv\Scripts\pio.exe device monitor --port COM7 --baud 115200
```

Para retornar ao firmware completo, faça o upload pelo `platformio.ini` da raiz.

O software coloca GPIO21 em LOW no início do `setup()`, mas não controla o pino
durante reset e bootloader. O gate do MOSFET do motor deve ter pull-down físico.
