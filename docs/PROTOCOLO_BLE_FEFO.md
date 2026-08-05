# Protocolo BLE FEFO

Referência atual: firmware `0.0.70`, nome `FEFO_BLE_V070`, protocolo `0.1`.

## Transporte

Perfil Nordic UART Service:

```text
Service  6e400001-b5a3-f393-e0a9-e50e24dcca9e
RX       6e400002-b5a3-f393-e0a9-e50e24dcca9e  celular → FEFO
TX       6e400003-b5a3-f393-e0a9-e50e24dcca9e  FEFO → celular
```

O firmware solicita MTU 512. Comandos são linhas de texto. Respostas seguem `OK`, `ERR` ou blocos `BEGIN ...` / `END ...`.

## Sincronização

```text
APP HELLO
APP CAPS
APP STATE
APP SYNC
CATALOG GET
SD INFO
```

`APP SYNC` informa a versão realmente instalada, estado e amostra do inventário. Áudios usam `APP AUDIO <n> <path>` e faces usam `APP FACE <n> <path>`.

## Controle principal

```text
PLAY <id|arquivo|caminho>
PLAY RANDOM|NEXT|PREV
PLAY LOOP ON|OFF
PAUSE
RESUME
STOP
VOL <0-100>
BRILHO <0-100>
LED <1-10>
VIBRA <1-5>
PANIC TRIGGER
PANIC ON|OFF|STATUS
MODE FACES
MODE BLE
FACE?
FACE <n|arquivo|caminho>
FACE RANDOM ON|OFF
```

Diagnóstico e conteúdo incluem `LIST AUDIO`, `LIST FACES`, `TREE`, `MEDIA INDEX`, `MEDIA STATUS`, `CATALOG BUILD`, `CATALOG STATUS`, `CATALOG GET`, `CONFIG`, `LOG`, `STATUS`, `PING` e `HELP`.

Exclusão direta por BLE exige confirmação:

```text
DELETE AUDIO /usr/a/a0001.wav
CONFIRM DELETE AUDIO /usr/a/a0001.wav CODE=1234
DELETE CONFIRM 1234
```

## Transferência Wi-Fi

O BLE inicia e acompanha a sessão; arquivos grandes são transferidos por HTTP local.

```text
WIFI PUSH START
```

`WIFI PUSH START` abre `FEFO_WIFI_xxxx`. O app associa o Android, envia arquivos/OTA e chama `POST http://192.168.4.1/finish`. O serviço desliga o BLE durante Wi-Fi para liberar memória; a desconexão nesse momento é esperada. `WIFI PULL` foi removido na v070.

## OTA

O app usa OTA por HTTP/Wi-Fi. O transporte OTA por BLE foi removido da compilação na v070.

Uma OTA só reinicia após escrita e validação. O catálogo remoto fornece tamanho e SHA-256 para o fluxo Wi-Fi.

## Compatibilidade

O app descobre pelo prefixo `FEFO_BLE_V`, lê a versão de `APP SYNC` e deve tolerar campos desconhecidos. Mudança incompatível exige incremento de `kProtocolVersion`.
