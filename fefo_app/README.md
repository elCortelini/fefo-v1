# Aplicativo FEFO

Aplicativo Flutter/Android de controle do FEFO Pet. Versão atual: `1.0.67+67` (App v067).

Principais funções: conexão BLE, sincronização do inventário do microSD, player de áudio, LEDs, vibração, pânico, faces, catálogo online, associação automática ao Wi-Fi temporário do FEFO, transferência de arquivos e OTA.

## Desenvolvimento

```powershell
flutter pub get
flutter analyze
flutter test
flutter run
flutter build apk --release
```

O APK de release é gerado em `build/app/outputs/flutter-apk/app-release.apk`. A versão deve ser incrementada em `pubspec.yaml` sempre que o app mudar.

Arquivos centrais:

- `lib/managers/bluetooth_manager.dart`: BLE, protocolo, inventário e transferências;
- `lib/pages/tela_catalogo_online.dart`: catálogo e OTA;
- `lib/pages/tela_audios_fefo.dart`: menus e player;
- `lib/pages/tela_faces_fefo.dart`: faces instaladas e seleção;
- `android/.../MainActivity.kt`: associação Android ao Wi-Fi do FEFO.

Consulte a [documentação principal](../README.md), o [guia de desenvolvimento](../docs/GUIA_DESENVOLVIMENTO.md) e o [status](../docs/STATUS_ATUAL.md).
