# FEFO Pet — firmware, aplicativo e catálogo

Projeto do FEFO Pet para a placa CYD ESP32 de 3,5 polegadas. Este repositório reúne o firmware embarcado, o aplicativo Android, o modelo do cartão microSD, o catálogo remoto e as ferramentas de preparação de conteúdo.

## Versões atuais

| Componente | Versão no código | Artefato local |
|---|---:|---|
| Firmware CYD | `0.0.71` / BLE `FEFO_BLE_V071` | `releases/FEFO_Firmware_v071.bin` |
| Aplicativo Android | `1.0.41+41` (App v041) | `releases/FEFO_App_v041.apk` |
| Catálogo remoto | schema 1, revisão 6 | `repository/catalog.json` |
| Catálogo do cartão | schema 1, revisão 3 | `sdcard/fefo.json` |

## Estado resumido

O protótipo funcional já oferece controle por BLE, áudio WAV pelo microSD, LEDs, vibração, pânico, catálogo online, transferência temporária por Wi-Fi, atualização OTA e faces RGB565. A base está implementada, mas ainda não deve ser tratada como uma versão de produção: faltam testes automatizados, regressão completa em hardware, recuperação robusta de atualização interrompida e redução do uso da flash.

Consulte [Status atual](docs/STATUS_ATUAL.md) para a matriz completa do que está pronto, do que foi apenas implementado e do que ainda falta.

## Estrutura do repositório

```text
app_android/       aplicativo Flutter para Android
src/ e include/    firmware ESP32/CYD
sdcard/            imagem-modelo do cartão microSD
repository/        catálogo público e manifesto de atualização
releases/          APKs e binários compilados
tools/             conversão e preparação de conteúdo
audiosFEFO/        arquivos-fonte de áudio
assets/            fontes de áudio e faces
diagnostics/       projetos isolados de diagnóstico
docs/              documentação técnica e registros históricos
```

## Documentação oficial

- [Status e fases](docs/STATUS_ATUAL.md)
- [Arquitetura atual](docs/ARQUITETURA_ATUAL.md)
- [Guia de desenvolvimento e publicação](docs/GUIA_DESENVOLVIMENTO.md)
- [Guia de operação e testes](docs/GUIA_OPERACAO.md)
- [Estrutura do microSD](docs/SDCARD.md)
- [Protocolo BLE](docs/PROTOCOLO_BLE_FEFO.md)
- [Histórico](docs/CHANGELOG.md)

Documentos de fases e checkpoints antigos permanecem em `docs/` como registro histórico. Quando houver divergência, os quatro documentos “atual”, “arquitetura”, “desenvolvimento” e “operação” acima são a referência.

## Início rápido

Firmware:

```powershell
.\.venv\Scripts\pio.exe run
.\.venv\Scripts\pio.exe run -t upload
```

Aplicativo:

```powershell
cd app_android
flutter pub get
flutter build apk --release
```

Antes de publicar qualquer versão, altere a versão correspondente, compile, teste na CYD e no Android e só então atualize `repository/catalog.json`.
