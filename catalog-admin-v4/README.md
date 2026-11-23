# FEFO - Catálogo Admin v4 (Gestor Pedagógico, Hardware & Bundles SD)

Versão 4.0 do Gerenciador de Catálogo Oficial do Ecossistema FEFO.

---

### Novidades e Arquitetura da v4

1. **Padrão Estrito de Nomenclatura do Robô (Compatibilidade v1 / ESP32 CYD):**
   * **Áudios:** `a0001.wav`, `a0002.wav`... (armazenados em `/repository/audio/` e mapeados para `/usr/a/` no SD Card).
   * **Expressões Faciais:** `f0001.raw`, `f0002.raw`... (display CYD 480x320 RGB565 mapeados para `/usr/f/`).
   * **Cards Físicos & RFID:** `c0001.png`, `c0002.png`... (mapeados para `/usr/c/`).
   * **Atividades Didáticas:** Arquivos `.pdf`, `.doc`, imagens para download e impressão familiar.

2. **Checklist Visual de Prontidão do Pacote:**
   * Visualização rápida em tempo real do estado de cada recurso (`Conto`, `Faces`, `Músicas`, `Cards`, `Atividades`) sem necessidade de abrir e inspecionar cada item manualmente.

3. **Gerador de Bundle SD (`📦 Gerar Bundle SD`):**
   * Exporta a especificação completa do pacote com mapa de UIDs, sons, faces e pastas prontas para transferência via App Flutter ou gravação direta no SD Card.

4. **Isolamento de Versões:**
   * Mantém o Catálogo v1 e Catálogo v3 100% preservados e funcionais.
