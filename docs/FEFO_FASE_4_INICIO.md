# FEFO v0.0.46/v0.0.47 — Fase 4

Data: 2026-07-30

## Objetivo

Iniciar OTA BLE real, substituindo o modo antigo de staging por escrita na partição OTA do ESP32.

## Implementado

- `UpdateService` agora usa a biblioteca `Update` do ESP32.
- `OTA BEGIN <bytes> [md5]` inicia escrita real na partição OTA.
- `OTA DATA <hex>` grava bytes na flash OTA.
- `OTA END` finaliza e valida a imagem.
- `OTA CANCEL` aborta a sessão.
- `OTA STATUS` mostra sessão, bytes recebidos, total esperado, estado de reboot e último erro.
- `OTA REBOOT` reinicia somente se `OTA END` validou a imagem.
- Script criado:
  - `tools/ble_ota_commands.py`
- Perfil para app criado na v0.0.47:
  - `APP HELLO`
  - `APP CAPS`
  - `APP STATE`
  - `APP SYNC`
  - `APP PROFILE`

## Comandos

```text
OTA STATUS
OTA BEGIN <bytes> <md5 opcional>
OTA DATA <hex>
OTA END
OTA CANCEL
OTA REBOOT
```

## Fluxo esperado

No computador, depois de compilar:

```text
python tools/ble_ota_commands.py .pio/build/fefo35/firmware.bin > ota_ble.txt
```

Enviar as linhas por BLE, uma por vez.

Depois de:

```text
OK OTA END VALIDATED SEND OTA REBOOT
```

enviar:

```text
OTA REBOOT
```

## Segurança

Esta versão não reinicia automaticamente ao final do OTA. O reboot é separado para reduzir risco durante depuração.

## Espaço do firmware

- v0.0.46: RAM 44.456 bytes — 13,6%; Flash 1.318.513 bytes — 67,1%.
- v0.0.47: RAM 44.456 bytes — 13,6%; Flash 1.320.589 bytes — 67,2%.
