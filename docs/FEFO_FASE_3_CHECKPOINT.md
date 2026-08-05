# FEFO v0.0.45 — checkpoint de fechamento da Fase 3

Data: 2026-07-29

## Status

Fase 3 fechada em nível funcional mínimo.

## O que ficou implementado

- Upload de áudio PCM via BLE para `/usr/a`.
- Comandos curtos validados:
  - `FB <arquivo> <bytes>`
  - `FD <hex>`
  - `FE`
  - `FC`
  - `FS`
- Comando robusto preparado para app/script:
  - `FX <seq> <hex> <sum8>`
- Listagem e reprodução de áudio enviado por BLE.
- Catálogo de mídia em `/sys/db/fefo.json`.
- Índice de mídia em `/sys/db/media.idx`.
- Remoção segura de áudio com confirmação:
  - `DELETE AUDIO <arquivo>`
  - `DELETE CONFIRM <codigo>`
- Script auxiliar para gerar comandos BLE a partir de PCM:
  - `tools/ble_pcm_commands.py`
- Modo diagnóstico ajustado:
  - `DIAG ON`: tela fixa no painel BLE.
  - `DIAG OFF`: libera retorno ao modo normal/faces.

## Decisão de escopo

Uploads longos por BLE Scanner não serão mais testados manualmente. O teste do arquivo de 4 bytes confirmou a cadeia BLE → SD → arquivo → reprodução. O protocolo `FX` fica preparado para automação por app/script.

## Espaço do firmware

- RAM: 44.192 bytes de 327.680 bytes — 13,5%.
- Flash: 1.313.049 bytes de 1.966.080 bytes — 66,8%.

## Próxima fase

Fase 4: OTA BLE real, com validação de firmware antes de reiniciar a CYD.
