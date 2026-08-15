# FEFO - Histórico de Evolução, Correções e Especificações do Sistema

Este documento registra o histórico contínuo de solicitações, atualizações, correções e especificações técnicas de arquitetura para o **Aplicativo FEFO (App v042)** e o **Firmware FEFO (ESP32/CYD)**.

---

## 📌 Visão Geral do Sistema

O sistema FEFO é composto por dois módulos principais:
1. **FEFO App (`fefo_app`)**: Aplicativo Flutter (Android/iOS) para controle remoto, reprodução de áudios, envio de arquivos por Wi-Fi P2P, ajuste de leds, vibrações, alarmes e botão de Pânico.
2. **FEFO Firmware (`fefo_firmware`)**: Firmware em C++ (PlatformIO / ESP-IDF / Arduino) executado na placa CYD (ESP32 com display touchscreen), responsável pela decodificação MP3/WAV, controle de periféricos, servidor Wi-Fi HTTP e protocolo UART BLE.

---

## 📋 Registro de Alterações & Correções (App v042)

### 1. Menu Conectar
- **Escaneamento Automático**: Ao entrar no menu de conexão, o app inicia imediatamente a busca de dispositivos FEFO por Bluetooth BLE (`_buscarFefoBle()`).
- **Botão Dinâmico**: O texto do botão reflete dinamicamente a ação possível no momento (`"Buscando..."`, `"Conectar"` ou `"Buscar FEFO"`).
- **Ajuste de Status**: Remoção do texto legado `"Ligue/reset o CYD e toque em buscar fefo ble"`. Cor da fonte do status alterada para **preto** para contraste ideal.

### 2. Desempenho do Catálogo Interno & Nomenclatura dos Áudios
- **Cache Local de Catálogo**: O arquivo `fefo.json` é armazenado em cache (`SharedPreferences`), permitindo que a leitura do catálogo e renderização dos menus ocorram de forma **instantânea** na inicialização e navegação.
- **Nomes do Catálogo**: Exibição dos nomes configurados no JSON em substituição aos nomes crus dos arquivos no SDCard.
- **Estrutura de Nomenclatura dos Arquivos**:
  - `menu - submenu - titulo.ext`: Especifica a categoria principal (`menu`), o título da seção interna (`submenu` em **verde**) e o nome de exibição (`titulo`).
  - `menu - titulo.ext`: Especifica a categoria principal e o título do áudio (sem cabeçalho verde de submenu).

### 3. Reestruturação do Menu Principal
- **Filtragem Dinâmica**: Exibição estrita apenas dos botões e seções que possuam conteúdo cadastrado.
- **Visual**: Títulos de seções em **verde** (fonte *Billotilde*) e botões de ação em **laranja**.
- **Esquema de Páginas e Menus**:
  - **Topo**: Botão **PÂNICO** (Disparo imediato de alarme por BLE).
  - **Exploração diária**: Alarmes, Aulas do Fefo, Desafios e Brincadeiras, Meu corpo, Contos de Fefo, Palavras do Fefo, Aventuras Seguras, Minha Rotina, Conhecendo os animais, CARDs Interativos.
  - **Estímulos Sonoros**: Músicas Clássicas, Instrumentais e Natureza, Jukebox do Fefo.
  - **Terapias guiadas**: Luzes Terapêuticas, Relaxamento.
  - **Sobre o Fefo**: Catálogo online, Quem é o Fefo, Configurações.
- **Remoção**: As opções de *Vibrações* e *Faces* foram removidas como menus primários de seleção.

### 4. Reprodutor de Áudio & Operações Múltiplas
- **Submenus com Títulos Verdes**: Agrupadores internos renderizam os nomes de submenus em fonte verde destaque.
- **Controles de Contexto**: Botões de reprodução (Play, Pause, Stop, Delete) padronizados com o mesmo tamanho e cor base **preta**, alterando para **laranja** quando ativos.
- **Barra de Progresso Interativa (Scrubber)**: Exibe a evolução do áudio em tempo real e permite ao usuário arrastar/tocar para ajustar a posição de reprodução (`seekAudio`).
- **Exclusão Múltipla**: Botão *"Deletar Múltiplos"* no final do menu, permitindo selecionar vários áudios com checkboxes para exclusão conjunta via Wi-Fi/BLE.

---

## 📂 Estrutura de Repositórios Separados

A estrutura do projeto foi organizada em diretórios independentes para permitir versionamento isolado no GitHub:

```
fefo-v1/
├── fefo_app/                # Código fonte do Aplicativo Flutter (Android / iOS)
│   ├── lib/                 # Telas, geradores, modelos e widgets
│   ├── android/             # Configurações nativas do Android
│   ├── ios/                 # Configurações nativas do iOS
│   └── pubspec.yaml         # Dependências do app
├── fefo_firmware/           # Código fonte do Firmware ESP32 / CYD
│   ├── src/                 # Código C++ do firmware
│   ├── include/             # Cabeçalhos .h
│   ├── lib/                 # Bibliotecas de hardware
│   ├── sdcard/              # Arquivos padrão para gravação no SDCard
│   └── platformio.ini       # Configurações do PlatformIO
├── docs/                    # Documentação do projeto e histórico de correções
└── releases/                # APKs compilados e artefatos de entrega
```

---

## 🛠️ Instruções para Publicação no GitHub

Para subir as atualizações para o repositório remoto:

1. **Git Commit & Push**:
   ```bash
   git add .
   git commit -m "feat(v042): correcoes de menu, catalogo rapido, scrubber interativo e separacao app/firmware"
   git push origin main
   ```

2. **Se desejar criar repositórios separados para o App e Firmware**:
   - Para o App: inicializar `git init` dentro de `fefo_app/` e conectar a um novo repositório `fefo-app`.
   - Para o Firmware: inicializar `git init` dentro de `fefo_firmware/` e conectar a um novo repositório `fefo-firmware`.
