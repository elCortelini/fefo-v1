# Changelog FEFO

> As entradas antigas abaixo registram as fases iniciais. A situação canônica está em `STATUS_ATUAL.md`; as compilações recentes são resumidas aqui porque nem todas receberam uma entrada individual.

## App v041 — 2026-08-02

- download, instalação, atualização, OTA e exclusão usam o mesmo cartão de progresso;
- exclusão mostra somente a barra e o estado `Deletando`;
- conclusão solicita reconexão Bluetooth e retorna à tela inicial.
- tocar no nome do áudio apenas abre seus controles; a reprodução começa somente no botão Play.
- ao sair de uma página de Jukebox, pelo app ou pelo Android, qualquer áudio em reprodução é interrompido.

## Firmware 0.0.71 / App v040 — 2026-08-02

- exclusão permanece na tela da Jukebox, com progresso abaixo do próprio áudio;
- queda temporária do BLE não substitui a lista pela tela de desconectado;
- app tenta finalizar a sessão Wi-Fi mesmo quando ocorre erro;
- firmware encerra AP abandonado após 45 segundos sem requisições e reinicia, restaurando o BLE;
- retorno à tela inicial ocorre somente depois do término ou da falha informada.

## App v039 — 2026-08-02

- Jukebox mantém a tela de andamento durante exclusão por Wi-Fi, mesmo após a desconexão BLE esperada;
- mensagem explica que a queda do BLE é temporária;
- falhas de exclusão são exibidas ao usuário;
- após sucesso ou falha, o app retorna à tela inicial para reconexão e sincronização.

## Firmware 0.0.70 — 2026-08-02

- removido o transporte legado `WIFI PULL`; permanece o fluxo celular → FEFO (`WIFI PUSH`);
- removida da compilação a OTA por BLE; OTA por Wi-Fi permanece ativa;
- fontes embarcadas limitadas às realmente usadas (1, 2 e 4);
- nível de log do framework reduzido para release;
- capacidades BLE atualizadas para anunciar `OTA_WIFI` e `WIFI_PUSH`.

## Firmware 0.0.69 / App v038 — 2026-08-02

- reconhecimento de faces `.raw` no inventário do microSD;
- persistência do modo Faces e do ciclo aleatório;
- app considera `APP FACE` na comparação de conteúdo instalado;
- página de Faces lista somente itens presentes no SD;
- downloads de faces ficam exclusivamente no Catálogo Online;
- BIN e APK registrados em `releases/`.

## Firmware 0.0.54–0.0.68 / App v013–v037 — resumo

- áudio WAV e menus dinâmicos por `fefo.json`;
- catálogo no Google Drive, tamanhos, checksums e seleção múltipla;
- transferência por Wi-Fi temporário controlado pelo BLE;
- progresso na CYD e no app;
- OTA por Wi-Fi e filtro de versões iguais/anteriores;
- instalação/exclusão de conteúdo, espaço do cartão e interface de faces.

## Firmware 0.0.48–0.0.53 / App v010–v014 — resumo

- identificação conjunta de firmware e app;
- filtro de descoberta BLE;
- correções de reinício durante áudio e conexão;
- menus gerados a partir do catálogo local;
- base para atualização de conteúdo.

Histórico resumido. Para a linha do tempo detalhada, consulte:

```text
docs/VERSION_HISTORY.md
```

## v0.0.47 — Fase 4 fechada no firmware

- Adicionado perfil para app:
  - `APP HELLO`
  - `APP CAPS`
  - `APP STATE`
  - `APP SYNC`
  - `APP PROFILE`
- Roadmap reescrito como guia vivo do projeto.
- Firmware atual: `FEFO_BLE_V047`.

## v0.0.46 — OTA BLE real iniciado

- `UpdateService` passa a usar `Update`.
- `OTA BEGIN`, `OTA DATA`, `OTA END`, `OTA CANCEL`, `OTA STATUS`, `OTA REBOOT`.
- Script `tools/ble_ota_commands.py`.

## v0.0.45 — Fase 3 fechada

- Upload de áudio via BLE validado.
- `DIAG ON/OFF` controla painel fixo ou retorno ao modo normal.
- Checkpoint da Fase 3.

## v0.0.38 a v0.0.44 — Gestão de conteúdo

- Upload de áudio para `/usr/a`.
- Delete seguro.
- Catálogo JSON.
- Protocolo `FX`.
- Script `tools/ble_pcm_commands.py`.

## v0.0.30 a v0.0.37 — BLE e controle

- Comandos BLE principais.
- Configuração persistente.
- Logs.
- Estado do dispositivo.
- Controle de áudio, LED, motor, brilho, faces e pânico.

## v0.0.1 a v0.0.29 — Base e diagnóstico

- Hardware base.
- Tela, SD, áudio, motor, LEDs e microfone.
- Primeira lógica de pânico.
- Testes e correções de BLE.
