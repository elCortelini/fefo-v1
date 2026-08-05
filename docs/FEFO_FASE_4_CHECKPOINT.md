# FEFO v0.0.47 — checkpoint de fechamento da Fase 4

Data: 2026-07-30

## Status

Fase 4 fechada no firmware.

O OTA BLE está implementado no lado da CYD, mas o fluxo completo de atualização ainda deve ser validado quando existir o app/transmissor automático. Não é produtivo nem seguro fazer o envio completo manualmente pelo BLE Scanner.

## O que ficou implementado

- OTA BLE com escrita real na partição OTA via biblioteca `Update`.
- `OTA BEGIN <bytes> <md5 opcional>`.
- `OTA DATA <hex>`.
- `OTA END`.
- `OTA CANCEL`.
- `OTA STATUS`.
- `OTA REBOOT` separado, apenas após validação.
- Script para gerar comandos OTA:
  - `tools/ble_ota_commands.py`
- Perfil para futuro app:
  - `APP HELLO`
  - `APP CAPS`
  - `APP STATE`
  - `APP SYNC`
  - `APP PROFILE`
- Respostas em linhas curtas para reduzir problemas de BLE.

## Comandos principais para o app

```text
APP HELLO
APP CAPS
APP STATE
APP SYNC
OTA STATUS
```

## Critério de aceite da Fase 4

- A CYD compila e grava via serial.
- `OTA STATUS` responde.
- O firmware possui escrita OTA real.
- O app terá um comando único de sincronização (`APP SYNC`) para descobrir recursos, estado e mídia.

## Espaço do firmware

- RAM: 44.456 bytes de 327.680 bytes — 13,6%.
- Flash: 1.320.589 bytes de 1.966.080 bytes — 67,2%.

## Próxima fase

Fase 5: construção do app ou transmissor automático BLE.
