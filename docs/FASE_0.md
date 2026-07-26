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

Na validação do MAX9814, o ADC apresentou bias próximo de 1397, sinal variável
e resposta visual confirmada pelo usuário. O firmware de teste permaneceu em
`READY` com SD e BLE ativos.

## Estado seguro do checkpoint

O firmware não executa automaticamente testes de motor, LED ou áudio. Motor e
NeoPixels são desligados após a inicialização, e o DAC permanece em zero. O
modo ativo deste checkpoint é o VU meter do MAX9814.

## Pendências para a V0.0.2

1. Diagnosticar o GPIO 22/RMT e recuperar os 15 NeoPixels já funcionais no
   FEFO 190.
2. Eliminar os estalos do áudio e validar reprodução WAV longa pelo microSD.
3. Provisionar identificador, lote e revisão de hardware em NVS.
4. Executar teste BLE prolongado e registrar estabilidade de heap.
5. Criar testes unitários da máquina de estados e do protocolo BLE.
6. Iniciar comandos BLE modulares para diagnóstico e controle.

Cada novo recurso deve entrar por um único módulo, possuir falha controlada e
ser validado isoladamente antes da integração com o `ActivityEngine`.
