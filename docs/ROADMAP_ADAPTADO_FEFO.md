# Roadmap adaptado do FEFO 3,5"

Este roadmap substitui o roteiro original como guia de trabalho prático. O documento antigo continua útil como inspiração, mas o firmware agora segue o que foi validado na placa CYD real.

## Fase 0 — Hardware base

Status: completa.

- Tela 480x320 funcional.
- SD card funcional.
- Áudio PCM pelo GPIO 26 funcional.
- Motor no GPIO 21 funcional.
- LED NeoPixel no GPIO 22 funcional.
- Microfone MAX9814 funcional.
- Watchdog ativo.
- Touch desligado por enquanto.

## Fase 1 — Controle BLE e comandos principais

Status: completa.

- BLE conectado por serviço estilo Nordic UART.
- Comandos de PLAY, PAUSE, RESUME, STOP.
- LIST AUDIO, LIST FACES, TREE e SD INFO.
- VOL 0-100, BRILHO 0-100, LED 1-10, VIBRA 1-5.
- STATUS, PING, HELP.
- Painel na tela mostrando conexão, último comando e última resposta.

## Fase 2 — Robustez, estado e organização

Status: base completa; OTA BLE real ainda pendente por segurança.

- Configuração persistente em `/sys/c/config.txt`.
- Logs em `/sys/log/events.log`.
- Índice de mídia em `/sys/db/media.idx`.
- Identidade do dispositivo via DEVICE.
- Modo pânico configurável.
- Diagnóstico básico.
- Protocolo OTA BLE iniciado como staging, ainda sem gravar firmware na flash.

Adaptação importante: o roadmap antigo citava Wi-Fi. Para este projeto, a rota oficial será BLE sempre que tecnicamente viável.

## Fase 3 — Gestão de conteúdo no SD via BLE

Status: fechada em nível funcional mínimo na versão 0.0.45.

Objetivo: permitir que o celular/app gerencie conteúdos do FEFO sem precisar retirar o SD card.

Primeiro bloco implantado:

- BLE solicita MTU 512.
- Buffer de comando BLE aumentado.
- Catálogo JSON em `/sys/db/fefo.json`.
- Upload de áudio PCM para `/usr/a`.
- Remoção segura de áudio em `/usr/a`, com código de confirmação.
- Pastas de sistema protegidas contra remoção por comando BLE.
- Upload funcional validado com arquivo PCM criado via BLE.
- Protocolo `FX` com sequência e checksum preparado para automação.
- Script `tools/ble_pcm_commands.py` para gerar comandos a partir de PCM real.
- Modo diagnóstico controlando tela fixa ou retorno das faces.

Itens deixados para depois, por não serem essenciais agora:

- Upload manual de arquivos grandes pelo BLE Scanner.
- Catálogo incremental.
- Upload de faces por BLE.

## Fase 4 — OTA BLE real

Status: fechada no firmware na versão 0.0.47.

- Receber firmware em chunks.
- Validar tamanho e CRC.
- Escrever com `Update.write()`.
- Finalizar com `Update.end(true)`.
- Reiniciar apenas se a imagem for válida.
- Implementar plano de recuperação se a atualização falhar.

Primeiro bloco implantado:

- Escrita real na partição OTA via `Update`.
- Validação por tamanho e MD5 opcional.
- Reboot separado por comando `OTA REBOOT`.
- Script `tools/ble_ota_commands.py` para gerar comandos BLE a partir de `firmware.bin`.
- Perfil de sincronização para app:
  - `APP HELLO`
  - `APP CAPS`
  - `APP STATE`
  - `APP SYNC`

Pendente para teste com app/transmissor:

- Envio completo de `firmware.bin` via BLE.
- Retentativa automática por pacote.
- Barra de progresso e logs de falha no app.

## Fase 5 — Aplicativo móvel FEFO

Status: futura.

- Interface própria para comandos BLE.
- Biblioteca de áudios/faces.
- Upload de conteúdo.
- Perfil do FEFO.
- Configuração do modo pânico.
- Atualização OTA BLE guiada.
