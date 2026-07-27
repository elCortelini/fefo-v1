# Fase 0 — Fundação modular

## Entregue

- perfil centralizado do hardware FEFO 3,5;
- partições duplas para futuro OTA;
- máquina de estados e composição central em `AppController`;
- módulos independentes para armazenamento, áudio, display, LEDs, vibração,
  microfone, BLE, pânico, atualização e diagnóstico;
- boot seguro com atuadores desligados;
- microSD com modo degradado em caso de falha;
- BLE mínimo com identidade e estado;
- VU meter contínuo para o MAX9814;
- modelo de conteúdo do cartão em `sdcard/`;
- diagnóstico anterior preservado em `examples/`.

## Validação física — 26/07/2026

| Item | Resultado |
|---|---|
| Upload CH340 / COM7 | Aprovado |
| ESP32-D0WD-V3 rev. 3, dual-core 240 MHz | Confirmado |
| Flash física de 4 MB, sem PSRAM | Confirmado |
| TFT ILI9488, BGR, SPI 55 MHz, 480x320 | Aprovado |
| microSD, aproximadamente 30,7 GB | Aprovado |
| BLE `FEFO_V001`, advertising e conexão | Aprovado |
| Motor/MOSFET no GPIO 21, PWM 5 kHz | Aprovado |
| MAX9814 no GPIO 35 / ADC1 | Aprovado |
| VU meter RMS, pico e saturação | Aprovado |
| Áudio DAC/NS8002D no GPIO 26 | Funciona com estalos pendentes |
| Repouso de áudio com DAC em zero | Aprovado e silencioso |
| 15 NeoPixels no GPIO 22 | Não aprovado; investigar |
| Touch | Desabilitado por decisão do projeto |
| Pânico e OTA BLE | Interfaces isoladas, execução bloqueada |

## Validação da V0.0.2 — 27/07/2026

Foi integrada uma máquina de estados independente para a resposta ao ruído:

1. mais de 16 das 20 barras (`levelPercent > 80`) inicia a qualificação;
2. o nível precisa permanecer alto continuamente por 2 segundos;
3. o motor liga em PWM `150/255` e todo o VU passa para tons de vermelho;
4. quando o nível cai, começa um prazo contínuo de 3 segundos;
5. um novo ruído cancela o desligamento; silêncio contínuo conclui a parada;
6. após 10 segundos ligados, o módulo de vibração força o desligamento e exige
   3 segundos em nível seguro antes do rearme.

Esse conjunto foi definido como **modo pânico**: detecção sustentada acima de
80%, vibração e alerta sonoro. O prazo de dez segundos é absoluto a partir do
acionamento; o silêncio ainda pode encerrá-lo antes. Em versão futura, a sirene
sintetizada será substituída por um áudio armazenado no microSD.

O log serial confirmou dois ciclos completos de qualificação, acionamento e
desligamento no hardware. Ruídos curtos posteriores foram rejeitados sem ligar
o motor.

O diagnóstico `diagnostics/led_isolated` reproduziu o azul progressivo do FEFO
190 e uma alternativa de 400 kHz, usando apenas Serial e Adafruit NeoPixel. O
usuário confirmou ausência total de luz nos quatro casos comparados:

| Framework/backend | 800 kHz azul | 400 kHz magenta |
|---|---:|---:|
| Arduino 2.0.17 / IDF 4.4.7 / RMT legado | Falhou | Falhou |
| Arduino 3.3.7 / IDF 5.5.2 / RMT novo | Falhou | Falhou |

Isso descarta como causa única o fluxo que mantinha o buffer apagado, a troca
de backend RMT e a seleção 800/400 kHz. O próximo teste deve usar transporte
independente de RMT e, se também falhar, medir o sinal no GPIO 22 e na entrada
do primeiro LED.

O teste seguinte substituiu completamente o RMT por pulsos temporizados nos
registradores do GPIO 22. A sequência vermelho, verde, azul, branco e apagado
funcionou no firmware integrado, conforme confirmação visual do usuário. Isso
aprova o caminho elétrico e os 15 LEDs e localiza a falha nos transportes RMT
testados, não na pinagem ou na alimentação da fita.

A sirene da V0.0.2 usa I2S0/DMA persistente em uma tarefa dedicada, portanto
não bloqueia display, MAX9814, BLE nem o timeout do motor. Ela varre de 650 a
1150 Hz, usa 70% do nível máximo e aplica rampas de 120 ms ao ligar e 60 ms ao
desligar. O log confirmou que a solicitação da sirene ocorreu no mesmo ciclo do
acionamento real do motor. A qualidade sonora e a possível realimentação da
sirene no MAX9814 ainda exigem confirmação física.

Na validação do MAX9814, o ADC apresentou bias próximo de 1397, sinal variável
e resposta visual confirmada pelo usuário. O firmware de teste permaneceu em
`READY` com SD e BLE ativos.

## Estado seguro do checkpoint

O firmware não executa automaticamente testes de motor, LED ou áudio. Motor e
NeoPixels são desligados após a inicialização, e o DAC permanece em zero. O
modo ativo deste checkpoint é o VU meter do MAX9814.

## Pendências para a V0.0.2

1. Transformar o transmissor NeoPixel direto já aprovado em serviço de efeitos
   definitivo, preservando os demais periféricos.
2. Validar os ciclos da sirene sem estalos e medir a realimentação acústica no
   MAX9814; depois validar reprodução WAV longa pelo microSD.
3. Provisionar identificador, lote e revisão de hardware em NVS.
4. Executar teste BLE prolongado e registrar estabilidade de heap.
5. Criar testes unitários da máquina de estados e do protocolo BLE.
6. Iniciar comandos BLE modulares para diagnóstico e controle.

Cada novo recurso deve entrar por um único módulo, possuir falha controlada e
ser validado isoladamente antes da integração com o `ActivityEngine`.
