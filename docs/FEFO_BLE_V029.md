# FEFO_BLE_V029 - checkpoint funcional

Data do checkpoint: 2026-07-28  
Firmware: `0.0.29`  
Nome BLE anunciado: `FEFO_BLE_V029`

## Estado confirmado

Esta e a versao funcional validada em bancada antes da proxima rodada de desenvolvimento.

- BLE conectado e recebendo texto pelo celular.
- Comando de play recebido por BLE e executando audio do SD.
- Comando de stop recebido por BLE e parando audio.
- Audio PCM reproduzido pelo GPIO 26.
- SD card montado e lendo `/sys/a/inf1.pcm`.
- Tela mostra estado BLE, contador de comandos recebidos, ultimo comando e caminhos PCM encontrados.
- Microfone MAX9814, modo panico, motor, LEDs e watchdog continuam integrados no firmware.

## BLE usado nesta versao

Perfil usado: Nordic UART Service via biblioteca `ESP32 BLE Arduino`.

Service UUID:

```text
6e400001-b5a3-f393-e0a9-e50e24dcca9e
```

Caracteristica RX, onde o celular escreve comandos:

```text
6e400002-b5a3-f393-e0a9-e50e24dcca9e
```

Caracteristica TX, onde o FEFO publica respostas/notificacoes:

```text
6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

## Comandos validados

Para tocar o arquivo `/sys/a/inf1.pcm`, usar qualquer uma destas formas:

```text
P.inf1
P:inf1
P=inf1
P inf1
PLAY:/sys/a/inf1.pcm
```

Para parar:

```text
STOP
S
AUDIO:STOP
```

## Observacoes importantes

- O token curto `inf1` resolve automaticamente para `inf1.pcm` dentro dos diretorios de audio conhecidos, incluindo `/sys/a`.
- O primeiro celular testado parecia conectar mas nao entregava o comando corretamente ao firmware. O segundo celular confirmou o fluxo correto.
- Bluetooth classico e rotas BLE antigas foram removidos do firmware principal para reduzir ambiguidade.
- NimBLE nao esta sendo usado nesta versao; a versao funcional ficou com `ESP32 BLE Arduino`.
- O touch segue desabilitado nesta fase para liberar os GPIOs dos atuadores externos.

## Build validado

Comando executado:

```text
.venv\Scripts\pio.exe run
```

Resultado:

```text
SUCCESS
RAM:   13.2%
Flash: 65.3%
```

## Proximo ponto seguro

A partir deste checkpoint, o proximo trabalho deve partir do BLE UART funcional e evoluir o protocolo de comandos sem trocar novamente a base BLE, salvo se houver uma razao forte.
