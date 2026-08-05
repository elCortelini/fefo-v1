# FEFO Fase 2 - checkpoint

Firmware final da Fase 2: `0.0.37`  
BLE: `FEFO_BLE_V037`

## Objetivo da fase

Transformar o controle BLE validado na Fase 1 em uma base mais organizada para
app real, persistencia, logs, biblioteca de midia e OTA por BLE.

## Concluido

- Comandos de dispositivo:
  - `DEVICE`
  - `DEVICE SET ID <id>`
  - `DEVICE SET NAME <nome>`
- Audio expandido:
  - `PLAY RANDOM`
  - `PLAY NEXT`
  - `PLAY PREV`
  - `PLAY LOOP ON`
  - `PLAY LOOP OFF`
  - `PAUSE` / `RESUME` com offset PCM.
- SD:
  - `SD INFO`
  - `TREE`
- Logs:
  - `/sys/log/events.log`
  - `LOG STATUS`
  - `LOG READ`
  - `LOG CLEAR`
- Midia:
  - `/sys/db/media.idx`
  - `MEDIA INDEX`
  - `MEDIA STATUS`
- Panico configuravel:
  - `PANIC ON`
  - `PANIC OFF`
  - `PANIC STATUS`
  - `PANIC SET LEVEL <0-100>`
  - `PANIC SET IDLE <10-3600>`
- Config persistente ampliada:
  - volume
  - brilho
  - led
  - modo
  - diagnostico
  - panico
  - nivel de panico
  - tempo de ociosidade
  - device_id
  - device_name
  - audio_loop
- OTA BLE:
  - `OTA STATUS`
  - `OTA BEGIN <bytes>`
  - `OTA DATA <hex>`
  - `OTA END`
  - `OTA CANCEL`

## OTA BLE

Por decisao de projeto, OTA sera por BLE. A Fase 2 define a sessao e comandos
de staging, mas ainda nao grava flash. A gravacao real deve entrar na Fase 3
com:

- `Update.begin(size)`
- `Update.write(...)`
- CRC32 ou SHA-256
- protecao contra pacote fora de ordem
- confirmacao antes de reboot

## Nota arquitetural

O parser BLE ainda permanece no `AppController` para preservar a estabilidade
de bancada. O contrato de protocolo esta documentado em
`docs/PROTOCOLO_BLE_FEFO.md`; a extracao fisica para `CommandProtocol` fica
segura para a Fase 3.

## Build validado

```text
RAM:   43.744 bytes / 327.680 bytes = 13,3%
Flash: 1.304.757 bytes / 1.966.080 bytes = 66,4%
```
