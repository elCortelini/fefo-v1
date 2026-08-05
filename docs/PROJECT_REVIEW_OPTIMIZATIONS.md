# Revisão técnica e otimizações sugeridas — FEFO v0.0.47

Data: 2026-07-30  
Firmware revisado: `0.0.47`  
BLE: `FEFO_BLE_V047`

## Resultado da compilação atual

```text
RAM:   44.456 / 327.680 bytes = 13,6%
Flash: 1.320.589 / 1.966.080 bytes = 67,2%
```

O firmware está dentro do slot OTA atual (`0x1E0000`, 1.966.080 bytes), mas já usa mais de dois terços da partição. Ainda há margem, porém a Fase 5 deve evitar crescimento desnecessário no firmware e empurrar interfaces ricas para o app.

## Estado geral

O projeto está funcional e coerente com a arquitetura atual:

- BLE como canal principal.
- SD card como armazenamento local.
- Áudio PCM no GPIO 26.
- Motor no GPIO 21.
- LEDs NeoPixel no GPIO 22.
- MAX9814 no GPIO 35.
- Tela 480x320.
- OTA BLE implementado no lado firmware.
- Perfil `APP SYNC` preparado para o app.

## Principais pontos fortes

- Hardware validado no protótipo real.
- Comandos BLE simples e fáceis de testar.
- Módulos separados para áudio, BLE, display, LEDs, microfone, pânico, storage, OTA e vibração.
- Watchdog ativo.
- Upload de áudio BLE validado ponta a ponta.
- OTA BLE estruturado com `Update`.
- Reboot OTA separado por segurança.
- Documentação de fases já existente.

## Melhorias prioritárias

### 1. Dividir `AppController.cpp`

Situação atual:

```text
src/app/AppController.cpp ≈ 2700 linhas
```

Esse é o maior ponto de manutenção. O arquivo virou orquestrador, parser de comandos, gerenciador de SD, app profile, upload, OTA e modos de tela.

Sugestão:

```text
src/app/AppController.cpp              ciclo principal e coordenação
src/app/commands/CommandRouter.cpp     roteamento BLE
src/app/commands/AudioCommands.cpp
src/app/commands/FileCommands.cpp
src/app/commands/OtaCommands.cpp
src/app/commands/AppProfileCommands.cpp
src/app/commands/ConfigCommands.cpp
src/app/commands/PanicCommands.cpp
```

Impacto:

- reduz risco de regressão;
- facilita testar comandos isolados;
- melhora legibilidade;
- não muda comportamento.

Prioridade: alta.

### 2. Mover textos longos para tabelas compactas ou PROGMEM

Há muitas respostas BLE e mensagens Serial literais. Em ESP32 isso não é trágico, mas contribui para flash.

Sugestão:

- reduzir textos de `HELP`;
- manter ajuda completa no app/documentação;
- deixar no firmware apenas comandos essenciais;
- avaliar `F()`/armazenamento em flash onde aplicável.

Impacto esperado:

- redução pequena a moderada de flash;
- respostas BLE mais curtas e confiáveis.

Prioridade: média.

### 3. Remover lógica temporária de teste de áudio no boot

Existe trecho marcado como temporário para volume máximo/testes de áudio. Isso foi útil nas fases iniciais, mas deve virar configuração.

Sugestão:

- remover teste automático de áudio no boot para versão de produto;
- controlar por comando `DIAG AUDIO TEST`;
- volume de boot deve vir de config.

Impacto:

- boot mais limpo;
- menos risco de som inesperado;
- comportamento mais previsível.

Prioridade: alta antes de produto.

### 4. Evitar delays longos em rotinas de teste

O áudio tem autoteste com `delay(4000)`. Como é rotina manual, não é crítico, mas é melhor evitar bloqueios longos.

Sugestão:

- transformar autoteste em estado não bloqueante;
- ou manter apenas em builds de diagnóstico.

Prioridade: média.

### 5. Fortalecer transferência BLE automatizada

`FB/FD/FE` funciona. `FX` já tem sequência e checksum simples.

Sugestão para app/transmissor:

- usar `FX` sempre;
- aguardar `OK FILE CHUNK`;
- se erro de sequência, consultar `FS`;
- retransmitir pacote esperado;
- limitar pacote conforme MTU real do celular.

Prioridade: alta na Fase 5.

### 6. Melhorar OTA BLE antes do teste completo

O firmware já grava OTA real. Antes de executar OTA completo pelo app, recomenda-se:

- adicionar progresso visual simples na tela;
- suspender reprodução de áudio durante OTA;
- bloquear comandos normais durante OTA, exceto `OTA STATUS`, `OTA DATA`, `OTA END`, `OTA CANCEL`;
- adicionar retry no transmissor;
- registrar erro OTA em log.

Prioridade: alta antes do primeiro OTA real pelo app.

### 7. Trocar `sum8` por CRC32 no app/transmissor

`sum8` é suficiente para detectar erros simples nos testes, mas é fraco para produto.

Sugestão:

- manter `sum8` por compatibilidade;
- adicionar comando futuro `FX2 <seq> <hex> <crc32>`.

Prioridade: média.

### 8. Persistência em NVS para identidade

Hoje `deviceId` e `deviceName` podem ser configurados e salvos no SD. Para produto, serial/lote não devem depender do cartão.

Sugestão:

- usar NVS para serial, lote e revisão de hardware;
- manter nome amigável no SD/app.

Prioridade: média.

### 9. Separar documentação de usuário e documentação técnica

Hoje a documentação está melhor, mas ainda há arquivos antigos de checkpoints.

Sugestão:

```text
docs/USER_GUIDE.md
docs/FIRMWARE_ARCHITECTURE.md
docs/BLE_PROTOCOL.md
docs/VERSION_HISTORY.md
docs/ROAD MAP - V1 3,5.md
```

Prioridade: média.

## Otimizações de tamanho de firmware

1. Reduzir/compactar `HELP`.
2. Remover ou condicionar logs `Serial.printf` em macro `FEFO_DEBUG`.
3. Remover diagnósticos antigos do firmware principal.
4. Evitar inclusão de bibliotecas não usadas.
5. Avaliar se `ESP32 BLE Arduino` pode ser trocado por NimBLE futuramente.

Observação: trocar para NimBLE pode reduzir RAM/flash em alguns projetos, mas exigiria revalidação do BLE. Como BLE atual está funcionando, não é prioridade imediata.

## Otimizações de desempenho

1. Manter envio BLE em linhas curtas.
2. Evitar `TREE` profundo durante reprodução de áudio.
3. Durante OTA/upload, pausar tarefas visuais pesadas.
4. Evitar redraws constantes da tela; atualizar painel apenas quando estado mudar.
5. Manter LED com brilho limitado para reduzir ruído elétrico e consumo.

## Riscos conhecidos

- OTA BLE completo ainda não foi testado com `firmware.bin` real.
- Envio manual via BLE Scanner não serve para arquivos grandes.
- `AppController.cpp` grande aumenta risco de bugs em manutenção.
- Sem app/transmissor, recursos de upload/OTA ficam difíceis de usar.
- Flash já está em 67,2%; ainda ok, mas deve ser acompanhado.

## Recomendação objetiva

Próximo trabalho técnico recomendado:

1. Criar transmissor BLE mínimo para PC ou app Android.
2. Usar `APP SYNC` como primeiro comando pós-conexão.
3. Automatizar upload PCM com `FX`.
4. Automatizar OTA BLE com `OTA DATA`.
5. Só depois refatorar `AppController.cpp`, usando testes práticos para evitar regressões.
