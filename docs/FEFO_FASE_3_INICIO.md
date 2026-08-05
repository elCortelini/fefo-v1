# FEFO v0.0.38 — início da Fase 3

Data: 2026-07-29

## Objetivo desta versão

Começar a Fase 3 alinhando o projeto ao funcionamento real validado na CYD: BLE como canal principal e SD card como repositório de conteúdos.

## Alterações implantadas

- Firmware atualizado para `0.0.38`.
- Nome BLE atualizado para `FEFO_BLE_V038`.
- BLE agora solicita MTU 512.
- Buffer interno de comando BLE aumentado para comandos maiores.
- Novo catálogo JSON gerado em `/sys/db/fefo.json`.
- Upload BLE de áudio PCM para `/usr/a`.
- Remoção segura de áudio com confirmação por código.
- Pastas protegidas: comandos de remoção/upload não podem escrever em `/sys`, `/pn` ou `/fa`; a área de usuário atual é `/usr/a`.

## Comandos novos

### Catálogo

- `CATALOG BUILD`
- `CATALOG STATUS`
- `CATALOG GET`

### Upload de áudio

- `FILE BEGIN <arquivo-ou-caminho> <bytes>`
- `FILE DATA <hex>`
- `FILE CHUNK <seq> <hex> <sum8>`
- `FILE END`
- `FILE CANCEL`

Atalho:

- `UPLOAD AUDIO <arquivo-ou-caminho> <bytes>`
- `UPLOAD DATA <hex>`
- `UPLOAD CHUNK <seq> <hex> <sum8>`
- `UPLOAD END`
- `UPLOAD CANCEL`

Aliases curtos:

- `FB <arquivo> <bytes>`
- `FD <hex>`
- `FX <seq> <hex> <sum8>`
- `FE`
- `FC`
- `FS`

Exemplo com um arquivo de 4 bytes:

```text
FILE BEGIN teste.pcm 4
FILE DATA 80808080
FILE END
```

Exemplo com pacote confiável:

```text
FB teste.pcm 4
FX 0 80808080 00
FE
```

Para gerar comandos de um PCM real no computador:

```text
python tools/ble_pcm_commands.py audio01.pcm > comandos_ble.txt
```

O arquivo final fica em:

```text
/usr/a/teste.pcm
```

### Remoção segura

```text
DELETE AUDIO teste.pcm
```

O FEFO responde algo como:

```text
CONFIRM DELETE AUDIO /usr/a/teste.pcm CODE=1234
```

Depois confirme:

```text
DELETE CONFIRM 1234
```

## Espaço do firmware

- RAM: 44.112 bytes de 327.680 bytes — 13,5%.
- Flash: 1.309.513 bytes de 1.966.080 bytes — 66,6%.

## Observação sobre OTA BLE

OTA BLE ainda não grava firmware na flash. A versão atual mantém apenas a sessão de recebimento/staging. A escrita real entra depois, com validação de tamanho, CRC e segurança de reinício.
