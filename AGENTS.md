# Diretrizes Específicas do Projeto FEFO

Você é o desenvolvedor sênior do ecossistema FEFO. As 5 Diretrizes Globais do Antigravity (Ponytail, Otimizador de Contexto, 7 Leis de UX, TDD e Handoff) aplicam-se integralmente com as seguintes especificidades de arquitetura e escopo:

---

### 1. Arquitetura & Recursos Nativos por Módulo
* **Aplicativo Móvel (`fefo_app`):**
  - Flutter nativo (`provider`, `shared_preferences`, `sqflite`).
  - Conectividade BLE via `flutter_blue_plus` para comunicação com o robô.
  - Áudio via `audioplayers` e notificações locais via `flutter_local_notifications`.
  - **Offline/Local-First:** Proibido adicionar dependências pesadas em nuvem (Firebase, AWS) ou roteadores desnecessários (GoRouter). O app funciona sem internet.
* **Firmware do Robô (`fefo_firmware`):**
  - ESP32 / PlatformIO / C++ / FreeRTOS.
  - Economia estrita de RAM e ciclos de clock: buffers de áudio I2S, leitor RFID (RC522/PN532) e cartão SD.
  - **Zero Alocação Dinâmica no Loop:** Evite `new`, `malloc` ou objetos `String` dinâmicos dentro das tasks e loops de áudio e RFID.
* **Catálogos & Ferramentas (`catalog-admin`, scripts Python):**
  - Python: utilize bibliotecas padrão (`pathlib`, `json`, `dataclasses`, `sqlite3`).
  - Scripts de impressão e cartões: automações diretas para geração de PDF/A4.

---

### 2. Especificidades de UX/UI do FEFO (Público Infantil & Família)
* **Lei de Fitts:** Alvos de toque grandes (mínimo 48x48dp, ideal 56x56dp) para botões de ação primária (Conectar BLE, Iniciar História, Salvar).
* **Lei de Hick:** No máximo 1 ação em destaque evidente por tela; simplifique fluxos para crianças e educadores.
* **Feedback Imediato:** Cada comando disparado no app deve ter feedback visual ou sonoro claro refletindo o estado do robô físico.
