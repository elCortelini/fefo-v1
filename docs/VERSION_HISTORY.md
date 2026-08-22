# Histórico de versões FEFO

Este histórico consolida as versões relevantes do desenvolvimento. Algumas versões intermediárias foram builds rápidos de diagnóstico; quando a mudança foi pequena, elas estão agrupadas.

## v0.0.1

Base inicial da nova arquitetura.

- PlatformIO configurado.
- CYD ESP32 identificada.
- Tela 480x320 inicial.
- SD card inicial.
- BLE inicial.
- Motor, microfone e áudio em investigação.

## v0.0.2

Primeira lógica funcional de pânico.

- MAX9814 com VU meter.
- Detecção de ruído sustentado.
- Motor acionado por ruído.
- Sirene experimental.
- Modo pânico limitado no tempo.

## v0.0.3

Pânico separado em módulo próprio.

- `PanicService`.
- `PanicConfig`.
- Diagnósticos de LED isolados.
- Testes com métodos diferentes para NeoPixel.

## v0.0.4 a v0.0.5

Testes de áudio e ajustes iniciais.

- Reprodução de PCM a partir do SD.
- Testes de volume.
- Áudio isolado/desligado em builds de diagnóstico.

## v0.0.6 a v0.0.29

Fase intensa de validação BLE e comandos.

- Migração prática para BLE.
- Ajuste de características RX/TX.
- Comandos de áudio corrigidos.
- Tela mostrando comandos recebidos.
- `PLAY`, `STOP` e respostas BLE estabilizados.

## v0.0.30

Marco funcional com modo pânico ocioso.

- Microfone liga apenas após ociosidade.
- Chegada de comando BLE desliga microfone.
- Áudio atual para ao chegar novo comando.
- LEDs acompanham áudio.
- Faces voltam a alternar.

## v0.0.31

Comandos básicos de status.

- `PING`.
- `STATUS`.
- `LIST AUDIO`.

## v0.0.32

Melhoria de painel BLE.

- Tela mostra último comando.
- Tela mostra última resposta.
- Contadores de RX/TX.

## v0.0.33

Comandos de controle expandido.

- `VOL 0-100`.
- `BRILHO 0-100`.
- `LED 1-10`.
- `VIBRA 1-5`.
- `PLAY`, `PAUSE`, `STOP`.
- `LIST AUDIO`.
- `TREE`.

## v0.0.34

Faces e modos.

- `LIST FACES`.
- `FACE`.
- `MODE FACES`.
- `MODE BLE`.

## v0.0.35

Configuração persistente.

- `CONFIG GET`.
- `CONFIG SET`.
- `CONFIG SAVE`.
- `CONFIG LOAD`.
- `/sys/c/config.txt`.

## v0.0.36

Fechamento da Fase 1.

- `RESUME`.
- `SD INFO`.
- Logs em `/sys/log/events.log`.
- `PANIC ON/OFF/STATUS`.
- `DIAG ON/OFF`.

## v0.0.37

Fase 2.

- `DEVICE`.
- `LOG`.
- `MEDIA`.
- `PLAY LOOP`.
- `PLAY RANDOM/NEXT/PREV`.
- OTA BLE ainda em staging.

## v0.0.38

Início da Fase 3.

- BLE solicita MTU 512.
- Buffer BLE maior.
- Catálogo JSON.
- Upload inicial de áudio para `/usr/a`.
- Delete seguro.

## v0.0.39

Correções de caminho SD.

- Fallback entre `/usr/a` e `usr/a`.
- Mensagens de erro mais úteis.

## v0.0.40

Diagnóstico de tela fixa.

- Faces temporariamente bloqueadas.
- Painel BLE fixo para leitura de erros.

## v0.0.41

Comandos curtos de upload.

- `FB`.
- `FD`.
- `FE`.
- `FC`.

## v0.0.42

Correção de `PLAY` para arquivos enviados.

- Mensagens de erro com motivo.
- Melhor resolução de caminho.

## v0.0.43

Fechamento do fluxo upload → listagem → play.

- `FE` informa tamanho real gravado.
- Arquivo enviado toca corretamente.

## v0.0.44

Protocolo robusto de pacote.

- `FX <seq> <hex> <sum8>`.
- `FS`.
- Script `tools/ble_pcm_commands.py`.

## v0.0.45

Fechamento da Fase 3.

- Modo diagnóstico virou comportamento controlado por `DIAG`.
- `DIAG ON`: tela fixa.
- `DIAG OFF`: libera faces/modo normal.
- Checkpoint da Fase 3.

## v0.0.46

Início da Fase 4.

- OTA BLE real no firmware.
- `UpdateService` usando biblioteca `Update`.
- `OTA BEGIN`.
- `OTA DATA`.
- `OTA END`.
- `OTA CANCEL`.
- `OTA STATUS`.
- `OTA REBOOT`.
- Script `tools/ble_ota_commands.py`.

## v0.0.47

Fechamento da Fase 4 no firmware.

- Perfil para app.
- `APP HELLO`.
- `APP CAPS`.
- `APP STATE`.
- `APP SYNC`.
- `APP PROFILE`.
- Roadmap reescrito como guia vivo do projeto.

## v1.091

- Subtítulos das seções do Menu Principal centralizados.
- Subtítulos padronizados com a fonte Billotilde.
- Cor dos subtítulos vinculada ao tema ativo.
- Marcas de anotação visual da referência não foram incluídas no aplicativo.
- APK publicado no catálogo do GitHub.

## v1.090

- Menu Principal atualizado para usar botões em aparência de pincelada.
- Ícones preservados nos itens do menu.
- Largura responsiva para evitar cortes em textos longos.
- Publicação do APK no catálogo do GitHub.

## Estado atual

```text
FW: 0.0.47
BLE: FEFO_BLE_V047
RAM: 44.456 bytes = 13,6%
Flash: 1.320.589 bytes = 67,2%
```
