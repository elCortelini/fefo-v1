# ROADMAP FEFO V1 — CYD ESP32 3,5" 480x320

Documento vivo do projeto FEFO V1 para a placa CYD ESP32 com tela 3,5" 480x320.

Este arquivo substitui o roadmap antigo como guia oficial. O roteiro original foi útil como ponto de partida, mas o desenvolvimento real seguiu os testes feitos no hardware e as decisões tomadas durante a implementação.

Versão de referência atual do firmware: `0.0.47`  
Nome BLE atual: `FEFO_BLE_V047`  
Data de revisão: 2026-07-30

---

## 1. Direção atual do projeto

O FEFO V1 será um dispositivo ESP32 controlado prioritariamente por BLE, com conteúdos armazenados em microSD.

O firmware deve ser simples, robusto e modular. O app futuro será responsável por interfaces ricas, catálogo amigável, download de conteúdo, envio automático de arquivos e atualização OTA.

### Decisões já consolidadas

- Comunicação principal: BLE.
- Wi‑Fi não faz parte do fluxo principal.
- OTA desejada: BLE.
- Tela: CYD 3,5" 480x320.
- Touch: desligado por enquanto.
- Áudio: PCM pelo GPIO 26.
- Motor: GPIO 21.
- LEDs NeoPixel: GPIO 22.
- Microfone: MAX9814 no GPIO 35.
- SD card: CS 5, MOSI 23, MISO 19, SCK 18.
- Área de usuário no SD:
  - áudios: `/usr/a`
  - faces: `/usr/f`
- Área de sistema:
  - configuração: `/sys/c/config.txt`
  - logs: `/sys/log/events.log`
  - índices/catálogos: `/sys/db`
  - áudios internos: `/sys/a`
  - faces internas: `/sys/f`

---

## 2. Status geral por fase

| Fase | Nome | Status | Versão principal |
|---|---|---:|---|
| 0 | Hardware base | Concluída | 0.0.1 a 0.0.29 |
| 1 | Controle BLE e comandos principais | Concluída | 0.0.30 a 0.0.36 |
| 2 | Robustez, persistência e organização | Concluída | 0.0.37 |
| 3 | Gestão de conteúdo no SD via BLE | Concluída no mínimo funcional | 0.0.38 a 0.0.45 |
| 4 | OTA BLE e perfil para app | Concluída no firmware | 0.0.46 a 0.0.47 |
| 5 | App/transmissor BLE | Próxima fase | Pendente |
| 6 | Polimento de produto | Futuro | Pendente |

---

## 3. Fase 0 — Hardware base

Status: concluída.

### O que foi validado

- Boot do projeto PlatformIO.
- Tela 480x320 funcionando.
- SD card funcionando.
- Áudio PCM funcionando no GPIO 26.
- Motor funcionando no GPIO 21.
- LEDs NeoPixel funcionando no GPIO 22.
- Microfone MAX9814 funcionando.
- Watchdog ativo.
- Touch desligado.

### Critério de aceite

- Firmware compila.
- Firmware grava na CYD.
- Tela mostra estado.
- SD monta.
- Áudio, motor, LED e microfone respondem nos testes.

---

## 4. Fase 1 — Controle BLE e comandos principais

Status: concluída.

### Implementado

- BLE usando perfil estilo Nordic UART.
- Nome BLE versionado.
- Característica RX para comandos.
- Característica TX para respostas/notificações.
- Tela mostra conexão BLE, último comando e última resposta.
- Comandos básicos:
  - `PING`
  - `STATUS`
  - `HELP`
  - `PLAY`
  - `PAUSE`
  - `RESUME`
  - `STOP`
  - `LIST AUDIO`
  - `LIST FACES`
  - `TREE`
  - `SD INFO`
  - `VOL 0-100`
  - `BRILHO 0-100`
  - `LED 1-10`
  - `VIBRA 1-5`
  - `MODE BLE`
  - `MODE FACES`

### Critério de aceite

- Celular conecta via BLE.
- Comandos chegam e aparecem na tela.
- Áudio toca por comando.
- Volume, brilho, LED, vibração e modos respondem.

---

## 5. Fase 2 — Robustez, configuração e estado

Status: concluída.

### Implementado

- Configuração persistente em `/sys/c/config.txt`.
- Logs em `/sys/log/events.log`.
- Índice de mídia em `/sys/db/media.idx`.
- Catálogo JSON básico em `/sys/db/fefo.json`.
- Comandos:
  - `CONFIG GET`
  - `CONFIG SET`
  - `CONFIG SAVE`
  - `CONFIG LOAD`
  - `LOG STATUS`
  - `LOG READ`
  - `LOG CLEAR`
  - `MEDIA INDEX`
  - `MEDIA STATUS`
  - `DEVICE`
  - `DEVICE SET ID`
  - `DEVICE SET NAME`
  - `PANIC ON`
  - `PANIC OFF`
  - `PANIC STATUS`
  - `PANIC SET LEVEL`
  - `PANIC SET IDLE`
  - `DIAG ON`
  - `DIAG OFF`

### Modo pânico atual

- O microfone só liga depois de tempo ocioso.
- O microfone desliga quando chega comando BLE.
- Ruído acima do limite pode acionar motor/sirene.
- O modo pânico segue isolado em módulo próprio.

### Critério de aceite

- Configuração salva e recarrega.
- Logs funcionam.
- Status do sistema é visível via BLE.
- Modo diagnóstico fixa a tela no painel BLE.

---

## 6. Fase 3 — Gestão de conteúdo no SD via BLE

Status: concluída no mínimo funcional.

### Implementado

- Upload de áudio PCM para `/usr/a`.
- Arquivo enviado por BLE foi salvo no SD, listado e reproduzido.
- Remoção segura de áudio com confirmação.
- Catálogo e índice atualizados.
- Pastas de sistema protegidas contra escrita/remoção por comandos de usuário.
- Script auxiliar para gerar comandos BLE a partir de PCM.

### Comandos de upload

```text
FB <arquivo> <bytes>
FD <hex>
FE
FC
FS
```

### Comando robusto preparado

```text
FX <seq> <hex> <sum8>
```

O comando `FX` valida sequência e checksum simples `sum8`. Ele está preparado para app/transmissor automático, mas não é produtivo testá-lo manualmente em arquivos grandes pelo BLE Scanner.

### Comandos de conteúdo

```text
CATALOG BUILD
CATALOG STATUS
CATALOG GET
DELETE AUDIO <arquivo>
DELETE CONFIRM <codigo>
```

### Ferramenta criada

```text
tools/ble_pcm_commands.py
```

### Critério de aceite

- Upload pequeno via BLE funciona.
- Arquivo aparece em `LIST AUDIO`.
- `PLAY` toca o arquivo enviado.
- Delete exige confirmação.
- Catálogo pode ser reconstruído.

### Itens deixados para o app

- Upload longo com progresso visual.
- Retentativa automática de pacotes.
- Upload de faces por BLE.
- Catálogo incremental.

---

## 7. Fase 4 — OTA BLE e perfil para app

Status: concluída no firmware.

Importante: o firmware já implementa o lado receptor do OTA BLE, mas o envio completo de `firmware.bin` ainda precisa ser validado quando existir app ou transmissor automático. Não é prático nem seguro fazer isso manualmente pelo BLE Scanner.

### Implementado

- Escrita real na partição OTA usando `Update`.
- Partições OTA:
  - `app0`: `0x1E0000`
  - `app1`: `0x1E0000`
- Comandos OTA:

```text
OTA STATUS
OTA BEGIN <bytes> <md5 opcional>
OTA DATA <hex>
OTA END
OTA CANCEL
OTA REBOOT
```

- `OTA END` valida a imagem.
- `OTA REBOOT` é separado por segurança.
- Script para gerar comandos OTA:

```text
tools/ble_ota_commands.py
```

### Perfil para o app

Comandos adicionados para o app descobrir capacidades e estado do FEFO:

```text
APP HELLO
APP CAPS
APP STATE
APP SYNC
APP PROFILE
```

O comando mais importante para a próxima fase é:

```text
APP SYNC
```

Ele entrega ao app:

- versão do firmware;
- nome BLE;
- versão do protocolo;
- capacidades;
- estado atual;
- contagem de áudios;
- contagem de faces;
- resumo das mídias;
- status OTA.

### Critério de aceite da Fase 4

- `OTA STATUS` responde.
- Firmware compila com biblioteca `Update`.
- `OTA BEGIN/DATA/END/REBOOT` existem.
- `APP SYNC` existe para guiar o app.
- Teste completo de OTA fica reservado para app/transmissor automático.

---

## 8. Fase 5 — App ou transmissor BLE

Status: próxima fase.

Esta é a próxima etapa real do projeto.

O objetivo da Fase 5 não deve ser criar um app final enorme logo de primeira. O melhor caminho é criar um transmissor/app mínimo que automatize BLE.

### Entrega 5.1 — Conexão e diagnóstico

O app/transmissor deve:

- encontrar dispositivos `FEFO_`;
- conectar via BLE;
- descobrir serviço RX/TX;
- ativar notificações TX;
- enviar `APP SYNC`;
- mostrar capacidades;
- mostrar estado;
- enviar comandos básicos.

Comandos mínimos:

```text
APP SYNC
STATUS
LIST AUDIO
PLAY
PAUSE
STOP
VOL
BRILHO
DIAG ON
DIAG OFF
```

### Entrega 5.2 — Gerenciar áudios

O app/transmissor deve:

- selecionar arquivo PCM;
- enviar por BLE usando `FB` + `FX` + `FE`;
- aguardar `OK` por pacote;
- usar `FS` para recuperar estado;
- mostrar progresso;
- tocar o arquivo após upload;
- deletar com confirmação.

### Entrega 5.3 — OTA BLE completo

O app/transmissor deve:

- selecionar `firmware.bin`;
- calcular MD5;
- enviar `OTA BEGIN`;
- enviar `OTA DATA` em blocos;
- aguardar resposta por bloco;
- enviar `OTA END`;
- confirmar `OTA REBOOT`;
- reconectar após reboot;
- confirmar nova versão por `APP HELLO`.

### Entrega 5.4 — App Android real

Depois do transmissor estar confiável:

- tela de conexão;
- tela de status;
- player de áudio;
- lista de áudios;
- upload/delete;
- configuração de volume/brilho/LED/vibração;
- modo pânico;
- atualização OTA;
- logs de suporte.

### Critério de aceite da Fase 5

- Conectar ao FEFO por BLE sem BLE Scanner.
- Rodar `APP SYNC`.
- Controlar áudio.
- Fazer upload de PCM real.
- Fazer OTA BLE completo.
- Confirmar versão nova após reboot.

---

## 9. Fase 6 — Polimento de produto

Status: futura.

Entram aqui apenas depois que o app/transmissor estiver funcionando:

- anti-downgrade por versão;
- assinatura de firmware;
- CRC32 por pacote;
- progresso visual de OTA na tela;
- progresso por LED;
- upload de faces;
- miniaturas de faces no app;
- catálogo amigável;
- suporte a múltiplos FEFOs;
- NVS para serial/lote imutáveis;
- modo fábrica;
- política de recuperação;
- testes de queda de energia.

---

## 10. Comandos BLE principais atuais

### Diagnóstico

```text
PING
HELP
STATUS
APP HELLO
APP CAPS
APP STATE
APP SYNC
SD INFO
TREE
DIAG ON
DIAG OFF
```

### Áudio

```text
LIST AUDIO
PLAY <audio>
P:<audio>
PAUSE
RESUME
STOP
PLAY RANDOM
PLAY NEXT
PLAY PREV
PLAY LOOP ON
PLAY LOOP OFF
VOL <0-100>
```

### Tela/faces

```text
LIST FACES
FACE <numero|random|arquivo>
MODE FACES
MODE BLE
```

Observação: se `DIAG ON` estiver ativo, faces ficam bloqueadas para manter a tela fixa no painel BLE.

### LEDs e motor

```text
BRILHO <0-100>
LED <1-10>
VIBRA <1-5>
```

### Conteúdo no SD

```text
FB <arquivo> <bytes>
FD <hex>
FX <seq> <hex> <sum8>
FE
FC
FS
DELETE AUDIO <arquivo>
DELETE CONFIRM <codigo>
CATALOG BUILD
CATALOG STATUS
CATALOG GET
```

### OTA

```text
OTA STATUS
OTA BEGIN <bytes> <md5 opcional>
OTA DATA <hex>
OTA END
OTA CANCEL
OTA REBOOT
```

---

## 11. Regras atuais do projeto

- Não reintroduzir Bluetooth clássico.
- Evitar Wi‑Fi no fluxo principal.
- Não depender do BLE Scanner para testes longos.
- Tudo que for longo deve ser automatizado por app/transmissor.
- Manter comandos curtos e respostas curtas.
- Não reiniciar automaticamente após OTA.
- Não apagar arquivos de sistema por comando BLE de usuário.
- Preservar modularidade do firmware.
- Manter watchdog ativo.
- Preferir validação prática no hardware real a requisitos especulativos.

---

## 12. Situação atual

Firmware atual:

```text
FEFO_BLE_V047
FW 0.0.47
```

Uso de memória da última compilação:

```text
RAM:   44.456 / 327.680 bytes = 13,6%
Flash: 1.320.589 / 1.966.080 bytes = 67,2%
```

Próximo passo recomendado:

```text
Fase 5.1 — criar transmissor/app BLE mínimo e rodar APP SYNC.
```
