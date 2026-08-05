# FEFO_BLE_V030 - checkpoint funcional

Data do checkpoint: 2026-07-28  
Firmware: `0.0.30`  
Nome BLE anunciado: `FEFO_BLE_V030`

## Estado da versao

Esta versao parte da `FEFO_BLE_V029`, mantendo o BLE UART funcional e adicionando regras de ociosidade, prioridade de audio, LEDs por audio e retorno das faces.

## Mudancas funcionais

- O microfone nao e ativado no boot.
- O microfone so e ativado depois que a CYD fica ociosa por 5 minutos.
- O modo panico so pode atuar quando o microfone esta ativo.
- Qualquer comando recebido via BLE desliga imediatamente o microfone/panico e reinicia o contador de ociosidade.
- Se um novo comando de audio chegar enquanto outro audio esta tocando, o audio anterior e interrompido e o ultimo comando recebido tem prioridade.
- Os LEDs usam dois comportamentos:
  - com audio PCM tocando: padrao tipo VU meter baseado no nivel do audio reproduzido;
  - sem audio tocando: cor unica suave, com troca lenta e efeito calmo.
- As faces voltaram a ser exibidas de forma aleatoria.
- A troca de face ocorre a cada 3 segundos.
- A tela de BLE aparece apos comando recebido e depois retorna automaticamente para as faces.

## BLE

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

## Comandos mantidos

Para tocar `/sys/a/inf1.pcm`:

```text
P.inf1
P:inf1
P=inf1
P inf1
PLAY:/sys/a/inf1.pcm
```

Para parar audio:

```text
STOP
S
AUDIO:STOP
```

## Arquivos principais alterados

- `include/board/Fefo35Board.h`
  - versao `0.0.30`;
  - nome BLE `FEFO_BLE_V030`;
  - tempo de ociosidade do microfone: `300000 ms`.
- `src/app/AppController.cpp`
  - controle de ociosidade;
  - ativacao/desativacao do microfone;
  - retorno das faces aleatorias;
  - prioridade do ultimo comando de audio.
- `src/modules/audio/AudioService.cpp`
  - novo comando de audio interrompe a reproducao anterior;
  - exposicao do nivel de playback para os LEDs.
- `src/modules/leds/LedService.cpp`
  - padrao VU meter durante audio;
  - padrao calmo quando sem audio.

## Build validado

Comando:

```text
.venv\Scripts\pio.exe run
```

Resultado:

```text
SUCCESS
RAM:   43.352 bytes / 327.680 bytes = 13,2%
Flash: 1.285.573 bytes / 1.966.080 bytes = 65,4%
```

## Upload validado na CYD

Porta usada:

```text
COM7 - USB-SERIAL CH340
```

Resultado:

```text
SUCCESS
Hard resetting via RTS pin...
```

## Observacao de projeto

Esta versao deve ser tratada como checkpoint funcional para evoluir o protocolo BLE e os modos de comportamento sem trocar a base BLE UART que ja foi validada.
