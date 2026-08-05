# FEFO Fase 1 - checkpoint

Firmware final da Fase 1: `0.0.36`  
BLE: `FEFO_BLE_V036`

## Concluido

- Protocolo BLE UART com respostas `OK`, `ERR`, `BEGIN` e `END`.
- Comandos de audio: `PLAY`, `PAUSE`, `RESUME`, `STOP`, `LIST AUDIO`.
- Controle de volume: `VOL`.
- Controle de LEDs: `BRILHO`, `LED 1..10`.
- Controle de motor: `VIBRA 1..5`.
- Faces via BLE: `LIST FACES`, `FACE`, `MODE FACES`, `MODE BLE`.
- Navegacao e diagnostico do SD: `SD INFO`, `TREE`.
- Configuracao persistente em `/sys/c/config.txt`.
- Logs em `/sys/log/events.log`.
- Panico configuravel via BLE.
- Modo diagnostico via `DIAG ON/OFF`.
- Tela BLE mostra ultimo comando e ultima resposta TX.

## Observacoes

- `RESUME` retoma o PCM pelo offset salvo no momento do `PAUSE`.
- `DIAG OFF` serve como preferencia de operacao, mas os comandos seguem
  disponiveis durante desenvolvimento para evitar bloqueio em bancada.
- O parser ainda esta dentro do `AppController`; a separacao em modulo
  dedicado fica recomendada para a Fase 2, quando o protocolo estabilizar.

## Espaco validado no build

```text
RAM:   43.672 bytes / 327.680 bytes = 13,3%
Flash: 1.300.365 bytes / 1.966.080 bytes = 66,1%
```
