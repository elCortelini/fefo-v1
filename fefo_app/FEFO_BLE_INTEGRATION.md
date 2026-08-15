# Integração BLE do app FEFO

Este app conversa com o firmware atual do FEFO usando BLE no padrão Nordic UART Service.

## Serviço BLE usado pelo firmware

- Nome anunciado esperado: `FEFO_BLE_V047` ou outro nome contendo `FEFO`
- Serviço: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- RX / escrita do app para a CYD: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- TX / notificações da CYD para o app: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

## Comandos principais

- `APP SYNC`
- `STATUS`
- `PLAY /sys/a/inf1.pcm`
- `P:inf1`
- `STOP`
- `PAUSE`
- `RESUME`
- `VOL 0..100`
- `BRILHO 0..100`
- `LED 1..10`
- `VIBRA 0..5`
- `LIST AUDIO`
- `TREE`

## Como o app envia comandos agora

O app deve usar os métodos explícitos do `BluetoothManager` sempre que possível:

- `playAudio('inf1')` envia `P:inf1`
- `playAudio('/rotina/rotina01.wav')` envia `P:rotina01`
- `stopAudio()` envia `STOP`
- `pauseAudio()` envia `PAUSE`
- `resumeAudio()` envia `RESUME`
- `setVolume(50)` envia `VOL 50`
- `setBrightness(60)` envia `BRILHO 60`
- `setLedPattern(3)` envia `LED 3`
- `vibrar(2)` envia `VIBRA 2`

## Compatibilidade mantida

O método `enviarComando()` ainda converte alguns comandos antigos para evitar
quebras se alguma tela herdada chamar strings antigas:

- `volume:50` vira `VOL 50`
- `vibracao3` vira `VIBRA 3`
- `efeitoluz2` vira `LED 3`
- `/luz/off` vira `BRILHO 0`
- `/jb/inf1.wav` vira `P:inf1`

Nas telas revisadas, os botões já usam o protocolo novo diretamente.
