# FEFO Pet — firmware, aplicativo e catálogo

Projeto do FEFO Pet para a placa CYD ESP32 de 3,5 polegadas. Este repositório reúne o firmware embarcado, o aplicativo Android, o modelo do cartão microSD, o catálogo remoto e as ferramentas de preparação de conteúdo.

## Versões atuais

| Componente | Versão no código | Artefato local |
|---|---:|---|
| Firmware CYD | `0.0.71` / BLE `FEFO_BLE_V071` | `releases/FEFO_Firmware_v071.bin` |
| Aplicativo Android | `1.0.44+44` (App v044) | `releases/FEFO_App_v044.apk` |
| Catálogo remoto | schema 1, revisão 6 | `repository/catalog.json` |
| Catálogo do cartão | schema 1, revisão 3 | `sdcard/fefo.json` |

## Estado resumido

O protótipo funcional oferece controle por BLE, áudio WAV/MP3 pelo microSD, LEDs, vibração, botão de Pânico, catálogo online, transferência temporária por Wi-Fi, atualização OTA e faces RGB565.

Consulte [Histórico de Evolução e Correções](docs/HISTORICO_EVOLUCAO_E_CORRECOES.md) para o detalhamento completo das alterações do App v042 e firmware.

## Estrutura do repositório

```text
fefo_app/         aplicativo Flutter para Android/iOS (código isolado)
fefo_firmware/    firmware ESP32/CYD (código PlatformIO isolado)
app_android/      espelho do projeto Flutter
src/ e include/   fontes do firmware na raiz
sdcard/           imagem-modelo do cartão microSD
repository/       catálogo público e manifesto de atualização
releases/         APKs e binários compilados
docs/             documentação técnica e registros históricos
```

## Documentação oficial

- [Histórico de Evolução e Correções (v042)](docs/HISTORICO_EVOLUCAO_E_CORRECOES.md)
- [Status e fases](docs/STATUS_ATUAL.md)
- [Arquitetura atual](docs/ARQUITETURA_ATUAL.md)
- [Guia de desenvolvimento e publicação](docs/GUIA_DESENVOLVIMENTO.md)
- [Guia de operação e testes](docs/GUIA_OPERACAO.md)
- [Protocolo BLE](docs/PROTOCOLO_BLE_FEFO.md)

## Início rápido

Firmware (`fefo_firmware/`):

```powershell
cd fefo_firmware
pio run
pio run -t upload
```

Aplicativo (`fefo_app/`):

```powershell
cd fefo_app
flutter pub get
flutter build apk --release
```
