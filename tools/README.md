# Ferramentas FEFO (Tools)

Este diretório contém os utilitários de backend e gerenciamento do ecossistema FEFO Pet.

## 🌟 Administrador Unificado de Catálogo (`catalog_manager.py`)

O gerenciamento de conteúdos (Áudios, Menus, Cards, Rostinhos e Sons do Sistema) é realizado através do **Administrador de Catálogo Web**:

1. **Modo Local (com servidor Python)**:
   - Execute o atalho `Executar_Administrador_Catalogo.cmd` na raiz do projeto.
   - O servidor inicia em `http://127.0.0.1:8765/catalog-admin/index.html`.
   - Gerencia conversão de áudio automática (PCM 16-bit Mono 22050Hz), edição visual, recorte de áudio, geração de voz com IA e assinatura digital do catálogo (`catalog.signature`).

2. **Modo Web / Nuvem (qualquer computador via GitHub Token)**:
   - O administrador pode ser aberto diretamente no navegador (ex: GitHub Pages ou abrindo `catalog-admin/index.html`).
   - Conectando seu **GitHub Personal Access Token**, todas as alterações de pacotes, edições e publicações são salvas diretamente no repositório GitHub sem depender do Python local.

## 📡 Comandos BLE OTA (`ble_ota_commands.py`)
Utilitário para envio e atualização de dados e pacotes via Bluetooth Low Energy (BLE) para o hardware CYD ESP32.

## 🔏 Assinatura de Catálogo (`sign_catalog.ps1`)
Gera a assinatura criptográfica e hash de integridade para validação pelo firmware do pet.
