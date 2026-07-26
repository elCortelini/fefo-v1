# FEFO PET V0.0.1 — Especificação funcional e técnica

## 1. Objetivo da versão

A V0.0.1 é a primeira fundação técnica do novo firmware FEFO. Ela não tenta entregar todo o ecossistema descrito nos documentos. Seu objetivo é validar, de forma modular e recuperável, o PET conectado ao aplicativo por BLE, operando localmente e sem depender de internet.

Esta versão deve:

- inicializar e diagnosticar o hardware;
- expor identidade, versão e capacidades do PET;
- reproduzir uma atividade local composta por áudio, face, LED e vibração;
- aceitar comandos BLE versionados;
- manter catálogo confiável dos conteúdos do SD;
- possuir estados explícitos, tratamento de falhas e watchdog;
- deixar interfaces preparadas para app, atualização e conteúdos futuros.

## 2. Princípios do produto

1. O FEFO é ferramenta de apoio operada por um adulto e não substitui acompanhamento humano.
2. As funções essenciais devem operar offline.
3. O áudio é o fluxo de tempo real de maior prioridade.
4. Falhas de LED, motor, touch ou SD não devem travar todo o dispositivo.
5. Nenhum módulo acessa diretamente o hardware pertencente a outro módulo.
6. Conteúdo, firmware e configuração têm ciclos de atualização separados.
7. Recursos sensoriais devem possuir limites de intensidade, duração e cancelamento.
8. Nenhuma gravação de áudio ambiente será realizada; o microfone poderá medir somente nível de sinal.
9. Dados de crianças não devem ser armazenados no PET.
10. Toda mudança de protocolo, catálogo ou configuração deve ser versionada.

## 3. Escopo da V0.0.1

### 3.1 Funcionalidades incluídas

#### Inicialização e diagnóstico

- leitura do modelo, revisão, flash, heap, PSRAM e motivo do último reset;
- teste de montagem e leitura do microSD;
- teste dos periféricos habilitados na configuração da placa;
- relatório pela serial e característica BLE de diagnóstico;
- tela de inicialização com estado dos componentes;
- modo degradado quando um periférico opcional falhar;
- registro do último erro em NVS.

#### Hardware-alvo congelado

- PET FEFO com tela TFT SPI de 3,5 polegadas e resolução 480x320, adotada como alvo definitivo da V0.0.1;
- placa-base conforme o esquema `ESP32-2.4TFT V1.0` fornecido;
- barramento TFT conforme o esquema: MISO 12, MOSI 13, SCK 14, CS 15, DC/RS 2 e backlight 27; reset do painel compartilhado/sem GPIO dedicado no perfil;
- saída DAC no GPIO 26 ligada ao amplificador integrado NS8002D e ao conector de alto-falante da placa, sem substituição do amplificador;
- segmento com 15 NeoPixels no GPIO 22;
- motor de vibração no GPIO 21, acionado externamente por MOSFET, diodo de flyback e resistor;
- microSD em SPI com CS 5, MOSI 23, MISO 19 e SCK 18;
- touch XPT2046 com CLK 25, CS 33, DIN/MOSI 32, DOUT/MISO 39 e IRQ 36;
- backlight da TFT comandado pelo GPIO 27 no esquema fornecido;
- LED RGB integrado nos GPIOs 17, 4 e 16;
- fotoresistor no ADC GPIO 34;
- microfone MAX9814 previsto no ADC GPIO 35.

O esquema fornecido é identificado como uma placa de 2,4 polegadas e não informa o CI controlador do LCD. Entretanto, o firmware FEFO 190 já opera satisfatoriamente na tela 3,5 polegadas 480x320 e será a referência funcional para inicialização, rotação, ordem de cores, frequência SPI e envio RGB565. A V0.0.1 não presumirá um controlador diferente: a configuração efetivamente usada na compilação funcional será reproduzida dentro do `BoardProfile` e validada com uma imagem-padrão 480x320. Essa configuração ficará isolada dos módulos da aplicação. Motor e fita devem possuir alimentação e circuitos adequados de potência; os GPIOs representam somente sinais de controle.

Os GPIOs 21 e 22 também aparecem no conector de sensor de temperatura/umidade do esquema. Ao usá-los para motor e NeoPixel, esse conector de sensor fica indisponível e não poderá ser habilitado simultaneamente.

#### Identidade do dispositivo

- identificador técnico derivado do MAC/eFuse;
- número de série, lote, revisão de hardware e variante armazenados em NVS;
- nome BLE curto derivado do serial;
- característica BLE somente leitura com identidade e versão;
- modo de provisionamento de fábrica separado do uso normal.

#### BLE

- NimBLE como implementação padrão;
- serviço GATT FEFO com versão de protocolo;
- características separadas para identidade, comandos, estado, eventos e manifesto;
- confirmação explícita de comandos;
- número sequencial de requisição para correlacionar comando e resposta;
- validação de tamanho, formato, estado permitido e parâmetros;
- advertising com identificador do produto, variante e versão de protocolo;
- reconexão e retomada segura do estado;
- pareamento/bonding configurável para unidades fora do ambiente de desenvolvimento.

#### Transferência e OTA por BLE

- BLE será o transporte principal tanto para conteúdo quanto para firmware;
- Wi-Fi não fará parte do fluxo normal da V0.0.1;
- um `BleTransferService` comum implementará fragmentação, sequência, janela de envio, confirmação, timeout e cancelamento;
- o tamanho de cada bloco será derivado do MTU realmente negociado;
- conteúdo será gravado primeiro em arquivo temporário no SD e publicado somente após tamanho e CRC32 válidos;
- firmware será escrito diretamente na partição OTA inativa pela API `Update`;
- a partição de boot somente será alterada depois do recebimento completo e da validação da imagem;
- interrupção da conexão abortará a transferência e manterá o firmware anterior inicializável;
- firmware será validado por tamanho, versão e SHA-256; assinatura criptográfica fica preparada como requisito da versão de produção;
- progresso será informado por eventos BLE e mostrado no display/LEDs;
- áudio, vibração e atividades serão encerrados de forma coordenada antes do OTA, sem suspender tarefas que possam estar segurando recursos;
- USB/serial continuará sendo o mecanismo técnico de recuperação em bancada.

#### Catálogo e microSD

- estrutura de diretórios padronizada;
- manifesto `fefo.json` com versão de esquema;
- leitura do catálogo sem depender de varredura completa a cada conexão;
- reconstrução controlada do catálogo quando necessário;
- escrita atômica por arquivo temporário, validação e renomeação;
- tamanho e CRC32 dos arquivos;
- cálculo de espaço total, usado e livre;
- aviso ao atingir 90% da capacidade;
- pastas de sistema protegidas contra exclusão;
- validação de caminhos para impedir acesso fora das pastas permitidas.

Estrutura inicial:

```text
/fefo.json
/system/audio/
/system/faces/
/content/audio/
/content/faces/
/content/activities/
/config/
/logs/
/update/
```

#### Motor de atividades

- uma atividade é descrita por dados, não por código específico de cada módulo pedagógico;
- a atividade pode coordenar áudio, face, efeito luminoso e vibração;
- comandos de iniciar, pausar, retomar e parar;
- prioridade e política de interrupção declaradas pela atividade;
- evento de progresso e conclusão enviado ao app;
- timeout máximo de segurança;
- conteúdo inexistente gera erro controlado, sem reiniciar o PET.

Exemplo conceitual:

```json
{
  "schema": 1,
  "id": "primeiros_passos_001",
  "title": "Apresentação do FEFO",
  "audio": "/content/audio/apresentacao.wav",
  "face": "/content/faces/feliz.raw",
  "ledPattern": "calm_blue",
  "vibrationPattern": "welcome",
  "priority": "normal",
  "interruptible": true
}
```

#### Áudio

- parser real de WAV PCM;
- validação de cabeçalho, frequência, canais e bits por amostra;
- reprodução por I2S/DMA, evitando temporização por `dacWrite()` em espera ativa;
- play, pause real, resume e stop;
- volume de 0 a 100 com limites configuráveis;
- fade curto para evitar estalos;
- fila de até três itens;
- eventos de início, progresso, término e erro;
- nível de áudio disponibilizado ao módulo de LEDs sem compartilhamento inseguro de variáveis.

#### Display e touch

- driver selecionado pelo perfil da placa;
- layout independente da resolução física;
- telas de boot, pronto, atividade, manutenção e falha;
- exibição de faces RAW565 compatíveis com a resolução do perfil;
- leitura em blocos e detecção de arquivo incompleto;
- touch disponível para diagnóstico e ações locais de segurança, mesmo que o app seja o controle principal.

#### LEDs

- padrões não bloqueantes;
- brilho máximo global configurável;
- estimativa/limitação de corrente;
- efeitos suaves como padrão;
- modos `idle`, `activity`, `regulation`, `progress` e `fault`;
- atualização isolada do BLE e do fluxo de áudio;
- comando de desligamento imediato.

#### Vibração

- uma única tarefa permanente e uma fila de comandos;
- padrões descritos por intensidade e duração;
- duração absoluta máxima de 20 segundos;
- cooldown mínimo entre padrões;
- cancelamento imediato, exceto quando uma política explicitamente validada determinar o contrário;
- desligamento do PWM em boot, erro, OTA e watchdog;
- GPIO definido pelo perfil da placa, nunca fixado no GPIO 21 da CYD.

#### Estado e segurança operacional

- máquina de estados central;
- Task Watchdog nas tarefas críticas;
- proteção contra brownout e registro do motivo de reset;
- heartbeat interno dos serviços;
- recuperação de falha do SD sem loop infinito;
- safe mode após reinicializações repetidas;
- limites de brilho, volume, vibração e duração centralizados;
- botão/comando adulto para parada imediata de estímulos.

### 3.2 Funcionalidades preparadas, mas não completas na V0.0.1

- microfone e acionamento automático de regulação;
- alarmes persistentes;
- RFID;
- telemetria de uso;
- FEFO Cloud;
- aplicativo Flutter completo;
- variantes HOME e SCHOOL definitivas.

As interfaces existirão para evitar retrabalho, mas essas funções não devem bloquear a validação da base.

### 3.3 Fora do escopo

- diagnóstico clínico ou terapêutico;
- gravação ou transmissão de áudio ambiente;
- identificação individual de crianças;
- reprodução de vídeo convencional;
- dependência permanente de internet;
- operação autônoma sem supervisão de adulto.

## 4. Estados do PET

```text
BOOT
  -> SELF_TEST
      -> READY
      -> DEGRADED
      -> SAFE_MODE

READY/DEGRADED
  -> ACTIVITY
  -> REGULATION
  -> TRANSFER
  -> MAINTENANCE
  -> FAULT

ACTIVITY/REGULATION/TRANSFER/MAINTENANCE
  -> READY
  -> DEGRADED
  -> FAULT
```

- `BOOT`: configuração mínima e saídas em estado seguro.
- `SELF_TEST`: inventário e teste dos periféricos.
- `READY`: conectado ou aguardando BLE, sem atividade.
- `DEGRADED`: opera sem um recurso opcional.
- `ACTIVITY`: executa conteúdo pedagógico escolhido pelo adulto.
- `REGULATION`: sequência sensorial de acolhimento, manual na V0.0.1.
- `TRANSFER`: reserva recursos para conteúdo ou catálogo.
- `MAINTENANCE`: diagnóstico, provisionamento ou OTA técnico.
- `FAULT`: falha recuperável com informação clara.
- `SAFE_MODE`: BLE e diagnóstico mínimos após falhas repetidas.

## 5. Módulos do firmware

| Módulo | Responsabilidade |
|---|---|
| `AppController` | Inicialização, máquina de estados e coordenação geral |
| `BoardProfile` | Pinos, resolução e capacidades de cada revisão de hardware |
| `DeviceIdentity` | Serial, lote, variante, versões e provisionamento |
| `ConfigService` | Preferências em NVS, validação e valores padrão |
| `BleService` | GATT, conexão, segurança e transporte de mensagens |
| `BleTransferService` | Blocos, janela, confirmações e progresso de conteúdo/firmware |
| `ProtocolCodec` | Codificação, validação e versionamento do protocolo |
| `CommandRouter` | Autoriza e encaminha comandos conforme o estado |
| `EventBus` | Eventos internos por filas, sem globais compartilhadas |
| `StorageService` | Único proprietário do SD e operações de arquivos |
| `ManifestService` | Leitura, validação e atualização atômica do catálogo |
| `ActivityEngine` | Execução coordenada de atividades declarativas |
| `AudioService` | WAV, I2S/DMA, volume, fila e progresso |
| `DisplayService` | Telas, faces, overlays e progresso |
| `TouchService` | Leitura, calibração e gestos locais permitidos |
| `LedService` | Padrões, limites de brilho/corrente e VU |
| `VibrationService` | Padrões, timeout, cooldown e cancelamento |
| `MicService` | Futuro nível sonoro, sem gravação |
| `UpdateService` | Conteúdo e firmware via BLE, integridade, anti-downgrade e rollback |
| `DiagnosticsService` | Self-test, métricas, erros e saúde do sistema |
| `WatchdogService` | Heartbeats, TWDT e entrada em safe mode |
| `LogService` | Log técnico local sem dados pessoais de crianças |

## 6. Serviço BLE proposto

| Característica | Direção | Uso |
|---|---|---|
| `device_info` | PET -> app, leitura | identidade, hardware e versões |
| `command` | app -> PET, escrita | comando estruturado e numerado |
| `response` | PET -> app, notify | confirmação ou erro do comando |
| `status` | PET -> app, leitura/notify | estado atual e atividade |
| `event` | PET -> app, notify | término, falha, alerta e progresso |
| `manifest` | PET -> app, leitura/notify | catálogo fragmentado |
| `transfer_control` | bidirecional | reservado para futuras transferências |
| `transfer_data` | bidirecional | reservado para blocos binários |

O MTU negociado não deve ser presumido como 512. O protocolo precisa funcionar com MTU pequeno, fragmentação, sequência, timeout e reenvio.

## 7. Funcionamento esperado

1. O PET liga com todas as saídas sensoriais desativadas.
2. Executa self-test e carrega configuração e identidade da NVS.
3. Monta o SD, valida `fefo.json` e calcula capacidade.
4. Inicia display, áudio e periféricos disponíveis.
5. Entra em `READY` ou `DEGRADED` e inicia advertising BLE.
6. O app conecta, lê identidade, capacidades, estado e manifesto.
7. O adulto seleciona uma atividade no app.
8. O comando é validado e confirmado antes da execução.
9. `ActivityEngine` coordena áudio, face, LED e vibração.
10. Estado, progresso e erros são enviados ao app.
11. Um novo comando segue a política de prioridade da atividade atual.
12. Stop sensorial interrompe áudio, LED e vibração imediatamente.
13. Ao terminar, o PET volta a `READY` e registra apenas métricas técnicas anônimas.

## 8. Adaptação dos módulos pedagógicos

Os módulos do app não devem virar módulos C++ independentes no firmware. Eles são pacotes de conteúdo executados pelo mesmo `ActivityEngine`:

- Primeiros Passos;
- Contos do FEFO;
- Alarmes;
- Desafios e Brincadeiras;
- Jukebox;
- Relaxamento;
- Aventuras Seguras;
- Aulas do FEFO;
- Minha Rotina;
- Meu Corpo;
- Cards Interativos.

Isso permite criar e atualizar experiências sem recompilar o firmware. Apenas capacidades verdadeiramente novas exigem firmware novo.

## 9. Melhorias em relação ao código legado

- BLE já existente será preservado, mas com protocolo versionado e seguro.
- Acesso ao SD será centralizado e não apenas protegido em alguns trechos.
- WAV será interpretado corretamente e reproduzido por DMA.
- Variáveis globais `volatile` serão substituídas por eventos, filas e estados protegidos.
- Display e LEDs não compartilharão uma única tarefa longa.
- Vibração não criará uma nova tarefa para cada comando.
- Modo de regulação substituirá a semântica ambígua de “pânico”.
- `PanicService` permanecerá isolado e inativo até que sua política sensorial seja definida e validada.
- OTA não aceitará imagem apenas por CRC; deverá validar versão, tamanho, hash e futuramente assinatura.
- Catálogo terá esquema, integridade e atualização atômica.
- Reinicializações e falhas serão diagnosticáveis.
- Hardware será selecionado por perfil, evitando pinos fixos incompatíveis.

## 10. Hardware e decisões elétricas obrigatórias

Antes da implementação completa, devem ser definidos:

- captura da configuração TFT_eSPI efetivamente usada pelo FEFO 190 e validação física de resolução, cores e orientação com uma imagem-padrão 480x320;
- dimensionamento do MOSFET, diodo e resistor do motor comandado pelo GPIO 21;
- confirmação de potência e impedância permitidas pelo NS8002D e pela alimentação adotada;
- alimentação, referência de terra, proteção e limitação de corrente dos 15 LEDs comandados pelo GPIO 22;
- MAX9814 externo e GPIO de leitura;
- necessidade de bateria, carregador e medição de carga;
- conectores reservados para RFID futuro;
- revisão e mapa de pinos da PCB final.

O motor não pode ser acionado diretamente pelo GPIO do ESP32; o circuito externo informado será tratado como parte obrigatória do hardware. A fita também requer alimentação dimensionada, terra comum e, conforme o modelo, adequação do nível lógico de dados. O áudio deverá respeitar os limites elétricos do NS8002D integrado.

## 11. Requisitos de aceitação da V0.0.1

- compilação reproduzível no PlatformIO;
- firmware menor que 50% da partição de aplicação destinada ao OTA;
- boot e self-test sem travamento quando o SD estiver ausente;
- advertising e conexão BLE estáveis por pelo menos 8 horas;
- identidade e manifesto recebidos integralmente com diferentes MTUs;
- conteúdo transferido por BLE com publicação atômica e validação de CRC32;
- firmware transferido por BLE para a partição inativa e validado por SHA-256;
- desconexão durante OTA mantém o firmware anterior inicializável;
- atividade demonstrativa executando áudio, tela, LED e vibração simultaneamente;
- áudio sem interrupções perceptíveis durante BLE e atualização visual;
- stop sensorial com latência definida e testada;
- motor nunca permanece ativo além do limite;
- queda de energia durante escrita do catálogo não corrompe a cópia válida;
- watchdog recupera tarefa bloqueada e registra a causa;
- nenhuma operação de arquivo acessa pasta protegida por caminho manipulado;
- funcionamento normal sem Wi-Fi e sem internet;
- código dividido por módulos, com contratos e decisões não óbvias documentados.

## 12. Decisões pendentes

1. O MAX9814 está fisicamente conectado ao GPIO 35, como indicado no roadmap?
2. O acionamento automático por ruído deve vir desativado por padrão até validação pedagógica?
3. Alarmes devem funcionar sem o celular conectado e sobreviver a reinicializações? Isso exige uma fonte confiável de horário, possivelmente RTC.
4. Conteúdos de sistema devem ficar no firmware, em partição interna protegida ou no SD com manifesto assinado?
5. Qual é a política correta de prioridade e cancelamento durante uma futura rotina de pânico/regulação?
