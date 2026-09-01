# FEFO Pet — documentação completa do projeto

Data da revisão: **01/09/2026**  
Repositório: `elCortelini/fefo-v1`

Este é o documento mestre do projeto. Ele consolida o aplicativo, o firmware da placa CYD, o catálogo online, o catálogo gravado no cartão microSD, os artefatos de release e o histórico de versões. Os documentos de fase continuam preservados como registro histórico; quando houver divergência, os arquivos-fonte e `repository/catalog.json` representam o estado atual.

## 1. Visão geral

O FEFO é formado por três partes que evoluem separadamente:

| Parte | Local | Responsabilidade |
|---|---|---|
| Aplicativo | `fefo_app/` | Interface Android/iOS, conexão BLE, catálogo online, transferência por Wi-Fi, instalação de conteúdos e OTA do firmware |
| Firmware | `fefo_firmware/` | Programa da CYD ESP32, tela, BLE, cartão SD, áudio, LEDs, vibração, pânico, servidor temporário Wi-Fi e atualização |
| Catálogo e releases | `repository/` e `releases/` | Manifesto público, metadados, URLs, checksums, APKs e binários do firmware |

O fluxo normal é:

```text
App ──BLE──> FEFO
 │            ├── consulta estado e inventário do SD
 │            └── habilita controle de áudio, LEDs, vibração e faces
 ├──Internet──> repository/catalog.json
 └──Wi-Fi temporário──> FEFO (envio de conteúdo ou firmware)
```

O funcionamento diário do FEFO e a organização dos menus devem depender do inventário local e do catálogo recebido pelo app. A internet é necessária somente para consultar/baixar o catálogo e os arquivos publicados; depois de instalado, o conteúdo e os menus locais devem funcionar sem internet.

## 2. Versões atuais registradas

| Componente | Versão atual | Fonte de verdade | Artefato |
|---|---:|---|---|
| App Android | `1.118` / build `1118` | `fefo_app/pubspec.yaml` e `fefo_app/lib/config/app_version.dart` | `releases/FEFO_App_v1.118.apk` |
| Firmware CYD | `1.099` | `fefo_firmware/include/board/Fefo35Board.h` | `releases/FEFO_Firmware_v1.099.bin` |
| Protocolo BLE | `0.1` | `Fefo35Board.h` e protocolo documentado | — |
| Catálogo online | schema `1`, revisão `63` | `repository/catalog.json` | `repository/catalog.json` |
| Faces publicadas | `6` | `repository/catalog.json` | itens `fa001` a `fa006` |
| Áudios publicados | `34` | `repository/catalog.json` | itens `au001` a `au035`, com lacunas históricas de IDs |

### Observação de consistência

O firmware atual declara a versão `1.099`, mas o nome BLE em `Fefo35Board.h` ainda aparece como `FEFO_BLE_V1098`. Isso deve ser tratado como pendência de consistência antes da próxima release: o nome BLE, a versão exibida, o binário e o catálogo devem usar o mesmo número de release.

## 3. Histórico de versões

### Fundação do firmware

| Versão | Marco |
|---|---|
| `v0.0.1` | Base PlatformIO, identificação da CYD, tela, SD e BLE iniciais |
| `v0.0.2` | Primeira lógica de pânico, microfone, motor e sirene experimental |
| `v0.0.3` | Pânico separado em módulo e diagnósticos de LED isolados |
| `v0.0.4–v0.0.5` | Testes de áudio PCM/WAV, volume e builds de diagnóstico |
| `v0.0.6–v0.0.29` | Validação do BLE, características RX/TX, `PLAY` e `STOP` |
| `v0.0.30` | Marco funcional: microfone por ociosidade, prioridade de áudio, LEDs e faces |
| `v0.0.31–v0.0.37` | Status, volume, brilho, LED, vibração, faces, configuração, logs e estado do dispositivo |
| `v0.0.38–v0.0.45` | Catálogo JSON, upload/delete de áudio, caminhos do SD e protocolo de pacotes |
| `v0.0.46–v0.0.47` | OTA BLE real e perfil de integração do app (`APP HELLO`, `APP CAPS`, `APP SYNC`, etc.) |
| `v0.0.48–v0.0.71` | Catálogo, Wi-Fi temporário, OTA Wi-Fi, faces, progresso e exclusão |
| `v1.077–v1.099` | Linha de releases de produção/teste do firmware, com foco em estabilidade de transferência e compatibilidade OTA |

### Linha do aplicativo

Existem artefatos publicados de `App v1.070` até `App v1.118`, além das versões iniciais de desenvolvimento. As versões intermediárias foram builds de correção e teste; a sequência de artefatos pode ser consultada em `releases/`.

Principais marcos recentes:

| Versão | Alterações registradas |
|---|---|
| `v1.090–v1.098` | Menu principal, tipografia, temas, catálogo, configurações, luzes, vibrações, pânico e player padronizados |
| `v1.099–v1.103` | Menus dinâmicos, sincronização, detecção de atualização e correções do fluxo Wi-Fi |
| `v1.104–v1.110` | Correções de conexão e preparação da transferência OTA para firmwares antigos e novos |
| `v1.111–v1.114` | Transferência mais confiável, player e interface |
| `v1.115–v1.117` | Ajustes de catálogo, conteúdo e estabilidade de conexão |
| `v1.118` | Release atualmente anunciada no catálogo; deve ser validada no aparelho antes de substituir a versão estável de referência |

Para a linha do tempo detalhada, consultar também `docs/VERSION_HISTORY.md`, `docs/CHANGELOG.md` e `docs/HISTORICO_EVOLUCAO_E_CORRECOES.md`.

## 4. Menus e recursos do aplicativo

### Estrutura original do menu principal

A primeira implementação funcional continha:

- Pânico;
- Exploração diária: Alarmes, Aulas do Fefo, Desafios e Brincadeiras, Meu Corpo, Contos do Fefo, Palavras do Fefo, Aventuras Seguras, Minha Rotina, Conhecendo os Animais e Cards Interativos;
- Estímulos sonoros: Músicas Clássicas, Instrumentais e Natureza e Jukebox do Fefo;
- Terapias guiadas: Luzes Terapêuticas e Relaxamento;
- Sobre o Fefo: Catálogo Online, Quem é o Fefo e Configurações.

O registro original está no commit funcional antigo `adc5868` e na especificação `docs/FEFO_V0.0.1_ESPECIFICACAO.md`.

### Recursos incorporados posteriormente

- menus e submenus de áudio baseados em `menu` e `submenu` do catálogo;
- Conhecendo os Animais como grupo próprio, sem misturar seus áudios ao Jukebox;
- Favoritos;
- Faces do Fefo;
- Vibrações do Fefo;
- conexão e reconexão com vários FEFOS disponíveis;
- player flutuante compartilhado;
- destaque do áudio em reprodução;
- temas, fontes Billotilde/KGPen e efeitos de LED;
- catálogo online com download, instalação, exclusão e atualização de firmware.

### Telas principais no código atual

As telas ficam em `fefo_app/lib/pages/` e incluem conexão, menu, catálogo, Jukebox, áudios, favoritos, animais, aulas, alarmes, rotina, corpo, contos, desafios, segurança, cards, relaxamento, luzes, vibrações, faces, configurações e informações sobre o FEFO.

## 5. Catálogo online

O arquivo público é `repository/catalog.json`. Ele usa schema `1` e contém:

```text
schema
catalogVersion
firmware { version, board, arquivo, tamanho, checksum, url, notas }
app      { version, build, arquivo, tamanho, checksum, url, notas }
audio[]  { id, titulo, menu, submenu opcional, arquivo, tamanho, checksum, tipo, url }
faces[]  { id, titulo, arquivo, tamanho, checksum, tipo, url }
```

Estado registrado na revisão 63:

| Grupo | Quantidade |
|---|---:|
| Jukebox do Fefo | 10 áudios |
| Jukebox do Fefo 2 | 4 áudios |
| Conhecendo os animais | 20 áudios |
| Faces | 6 |

O campo `titulo` é o nome mostrado ao usuário. O campo `arquivo` é o caminho físico no SD. Portanto, o app não deve usar `a0016.wav` como título quando houver metadado no catálogo.

### Regras do catálogo

1. Um conteúdo instalado deve desaparecer da lista de download após a confirmação por checksum e inventário do SD.
2. O grupo visual deve ser derivado do campo `menu`; um menu inexistente deve ser criado pelo app ao sincronizar o catálogo.
3. A criação dos menus locais não deve exigir internet depois que o catálogo foi salvo no FEFO/app.
4. Uma atualização do app ou firmware só deve ser oferecida quando a versão do catálogo for numericamente superior à instalada.
5. Toda alteração de arquivo exige novo tamanho, SHA-256 e incremento de `catalogVersion`.

## 6. Estrutura atual do cartão microSD

Estrutura usada pelo firmware em `fefo_firmware/sdcard/`:

```text
/
├── fefo.json              catálogo/manifesto ativo com títulos e grupos
├── cfg/
│   └── content.json       metadados locais de conteúdo
├── usr/
│   ├── a/                 áudios do usuário/conteúdo
│   │   └── aNNNN.wav      arquivos de áudio numerados
│   └── f/                 faces RGB565/RGB raw
│       └── fNNNN.raw      imagens de face
├── sys/
│   ├── a/                 área reservada de áudio do sistema
│   └── f/                 área reservada de faces do sistema
├── act/                   área reservada para atividades
├── log/
│   └── events.log         eventos e diagnósticos do firmware
└── tmp/                   arquivos temporários durante transferências
```

No modelo versionado atual há 34 WAV em `usr/a`, 6 faces em `usr/f` e os arquivos de configuração/controle. O firmware também pode reconstruir o inventário do SD e gerar `/sys/db/fefo.json` durante comandos de catálogo; o manifesto enviado pelo app deve ser preservado como catálogo ativo quando aplicável.

## 7. Comunicação e atualização

### BLE

O BLE é o canal principal de controle e sincronização. Os comandos e respostas estão documentados em `docs/PROTOCOLO_BLE_FEFO.md`. Entre os grupos existentes estão:

- identidade, `PING`, `STATUS`, `HELP` e capacidades;
- `APP HELLO`, `APP CAPS`, `APP STATE`, `APP SYNC` e `APP PROFILE`;
- `PLAY`, `STOP`, volume, LED, vibração e faces;
- `LIST AUDIO`, `LIST FACES`, `TREE`, `MEDIA`, `CATALOG GET` e logs;
- upload/delete de conteúdo e OTA BLE quando habilitada na build.

### Wi-Fi temporário

O app usa o BLE para iniciar/configurar o fluxo e depois envia conteúdo ou firmware para o endereço temporário do FEFO. A transferência deve:

1. confirmar que o FEFO entrou no modo de atualização;
2. enviar o arquivo em fluxo, sem manter cópias grandes desnecessárias na RAM;
3. validar tamanho e SHA-256;
4. ativar o manifesto/conteúdo no SD somente após gravação completa;
5. reiniciar apenas depois da confirmação de sucesso;
6. reconectar ao BLE e executar nova sincronização.

Uma queda de conexão não deve ser interpretada automaticamente como sucesso. O app deve mostrar a falha e o firmware deve preservar a versão anterior quando a OTA não for validada.

### Ordem recomendada de atualização

Para uma unidade antiga, especialmente firmware `v1.086`, a ordem operacional mais segura é:

1. instalar uma versão do app compatível com o fluxo de atualização para firmware antigo;
2. atualizar o firmware pelo app e aguardar a confirmação da versão após a reconexão;
3. fechar e abrir o catálogo novamente;
4. instalar conteúdos;
5. conferir menu, título e execução do áudio.

Não gravar diretamente a CYD por cabo durante o teste OTA, salvo solicitação explícita; o cabo deve ser usado para coleta de logs e diagnóstico.

## 8. Organização do repositório

```text
fefo_app/                 fonte principal do app Flutter
fefo_firmware/            fonte principal do firmware PlatformIO
fefo_firmware/sdcard/     imagem-modelo do cartão
repository/catalog.json   catálogo público atual
repository/               arquivos publicáveis auxiliares
releases/                 APKs, BINs e checksums
FEFO_novos_conteudos/     entrada para novos áudios/faces e planilha
docs/                     especificações, protocolos, guias e histórico
tools/                    scripts de preparação, BLE e validação
```

`app_android/`, `src/` e `include/` devem ser tratados como espelhos/legado somente quando o histórico indicar isso. A fonte principal atual é `fefo_app/` para o app e `fefo_firmware/` para o firmware.

## 9. Processo de release

### App

1. incrementar `version` em `fefo_app/pubspec.yaml`;
2. atualizar `fefo_app/lib/config/app_version.dart`;
3. executar testes e gerar APK release;
4. copiar o APK para `releases/FEFO_App_vX.YYY.apk`;
5. calcular tamanho e SHA-256;
6. atualizar o objeto `app` do catálogo;
7. incrementar `catalogVersion`;
8. testar instalação e atualização em um aparelho real.

### Firmware

1. atualizar `kFirmwareVersion` e `kBleName` juntos em `Fefo35Board.h`;
2. compilar com PlatformIO usando o perfil da CYD;
3. conferir tamanho contra a partição OTA;
4. copiar o binário para `releases/FEFO_Firmware_vX.YYY.bin`;
5. calcular SHA-256;
6. atualizar o objeto `firmware` do catálogo;
7. testar boot, BLE, SD, áudio, Wi-Fi, OTA e retorno após reinício.

### Conteúdo

1. preparar o áudio na pasta `FEFO_novos_conteudos/audio/`;
2. registrar título, menu, submenu, arquivo físico, tamanho e SHA-256;
3. garantir que o caminho físico e o campo `menu` sejam compatíveis;
4. publicar o arquivo em `repository/audio/` ou na origem definida no catálogo;
5. atualizar `repository/catalog.json` e incrementar a revisão;
6. testar download, gravação no SD, remoção da oferta e criação do menu.

## 10. Checklist de validação

- [ ] App exibe a versão do APK instalada.
- [ ] Firmware informa a versão real após `APP SYNC`.
- [ ] Nome BLE e versão do firmware são coerentes.
- [ ] Catálogo remoto pode ser lido ou o app usa cache local de forma explícita.
- [ ] Conteúdo baixado é validado por tamanho e SHA-256.
- [ ] O áudio gravado aparece no menu indicado pelo catálogo.
- [ ] O título amigável substitui o nome físico do arquivo.
- [ ] Conteúdo instalado não continua disponível para download.
- [ ] OTA só reinicia após validação completa.
- [ ] Após a reconexão, o app volta ao menu principal e sincroniza novamente.
- [ ] APK, BIN, catálogo, tamanho e checksum apontam para os mesmos artefatos.

## 11. Documentos complementares

- `docs/ARQUITETURA_ATUAL.md` — arquitetura técnica atual.
- `docs/PROTOCOLO_BLE_FEFO.md` — protocolo BLE.
- `docs/SDCARD.md` — cartão microSD.
- `docs/GUIA_DESENVOLVIMENTO.md` — compilação e publicação.
- `docs/GUIA_OPERACAO.md` — operação e testes.
- `docs/VERSION_HISTORY.md` — histórico detalhado de versões.
- `docs/CHANGELOG.md` — changelog resumido.
- `docs/FEFO_V0.0.1_ESPECIFICACAO.md` — escopo técnico inicial.

