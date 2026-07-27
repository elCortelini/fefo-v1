# Checklist da Fase 0 — Preparação para v0.0.4

## Status atual do projeto
- [x] Firmware principal documentado como versão `v0.0.3`.
- [x] `AppController` como orquestrador central.
- [x] `main.cpp` mínimo com apenas `setup()` e `loop()`.
- [x] Perfil de hardware centralizado em `include/board/Fefo35Board.h`.
- [x] `BleService` mínimo ativo com identity e estado.
- [x] `PanicService` implementa a lógica de resposta ao ruído e coordena motor e áudio.
- [x] Diagnóstico NeoPixel isolado em `diagnostics/led_patterns`.
- [x] Documentação de versão e decisões atualizada em `README.md` e `docs/FEFO_V0.0.3.md`.

## Itens a completar antes da transição para a Fase 1 prevista
- [ ] Confirmar causa da falha dos 15 NeoPixels em GPIO22 (hardware vs. software).
- [ ] Validar reprodução de áudio sem estalos e testar WAV longo via microSD.
- [ ] Implementar Watchdog (`esp_task_wdt_init`, `esp_task_wdt_add`, `watchdogFeed()`).
- [ ] Formalizar e registrar os 5 padrões obrigatórios de Fase 0.
- [ ] Documentar as 11 decisões de arquitetura da Fase 0.
- [ ] Completar infraestrutura de OTA/Browser técnico com rota `/status`.
- [ ] Verificar estabilidade BLE prolongada e estabilidade de heap/ram.
- [ ] Adicionar testes unitários para `PanicService`, BLE, Audio, SD e Display.
- [ ] Confirmar `Flash < 50%` no build final.
- [ ] Atualizar `CHANGELOG.md` com a meta `v0.0.4` após validação final.

## Notas de versão
- Esta checklist é o passo de documentação e controle de qualidade necessário antes
  de promover a versão candidata `v0.0.4`.
- O caminho para `v0.0.4` permanece condicionado aos testes elétricos dos LEDs
  e à validação da reprodução de áudio.
- Se qualquer item crítico falhar, o objetivo deve ser manter `v0.0.3` como
  checkpoint diagnóstico e trabalhar apenas nos itens pendentes.
