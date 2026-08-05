# Guia de desenvolvimento e publicação

## Pré-requisitos

- Windows com PowerShell.
- PlatformIO instalado no `.venv` do projeto.
- Flutter compatível com Dart `>=3.2.0 <4.0.0` e Android SDK.
- `ffmpeg` no PATH para converter áudio.
- Python e Pillow para converter faces.
- cabo USB de dados e driver da porta serial da CYD.

## Compilar e gravar o firmware

Na raiz:

```powershell
.\.venv\Scripts\pio.exe run
.\.venv\Scripts\pio.exe run -t upload
.\.venv\Scripts\pio.exe device monitor -b 115200
```

O binário sai em `.pio/build/fefo35/firmware.bin`. Copie a release aprovada para `releases/FEFO_Firmware_vNNN.bin`.

Antes de compilar uma nova versão, atualize em `include/board/Fefo35Board.h` tanto a versão semântica (`0.0.NN`) quanto o nome BLE (`FEFO_BLE_VNNN`). Cada alteração de firmware recebe novo número.

## Compilar o aplicativo

```powershell
cd app_android
flutter pub get
flutter analyze
flutter test
flutter build apk --release
```

O APK sai em `app_android/build/app/outputs/flutter-apk/app-release.apk`. Atualize `version:` em `app_android/pubspec.yaml` e copie para `releases/FEFO_App_vNNN.apk`. Cada alteração do app recebe novo número.

## Preparar áudio

Coloque os originais em `audiosFEFO/`. O formato final é WAV PCM mono, 16 bits e 22,05 kHz.

```powershell
.\tools\convert_audio.ps1 -Recurse
.\tools\prepare_jukebox.ps1
```

Use nomes físicos sequenciais `a0001.wav`, `a0002.wav` etc. Cadastre título, menu, tamanho e checksum. O título não deve depender do nome físico.

## Preparar faces

Faces finais são `fNNNN.raw`, RGB565 little-endian, 480×320. Use `tools/convert_assets.py` e confirme que cada arquivo tem exatamente 307.200 bytes. Mantenha uma imagem fonte em `assets/faces/` para edição futura.

## Atualizar os catálogos

1. Adicione o arquivo convertido em `sdcard/usr/a` ou `sdcard/usr/f`.
2. Atualize `sdcard/fefo.json` com os metadados locais.
3. Faça upload do arquivo final ao repositório do Google Drive.
4. Obtenha um link público de download direto.
5. Atualize `repository/catalog.json`, incluindo `url`, `tamanho` e SHA-256.
6. Incremente `catalogVersion`.
7. Valide sintaxe JSON e confirme que tamanho/checksum correspondem ao arquivo publicado.

Para firmware, atualize também o objeto `firmware` do catálogo. Nunca anuncie uma versão antes de ela ter sido gravada e testada em uma CYD.

## Política recomendada de releases

- `releases/`: versão atual mais duas versões anteriores de app e firmware.
- arquivo histórico externo: versões mais antigas e notas de migração.
- nunca reutilizar um número de versão para conteúdo diferente.
- registrar para cada release: data, versão, checksum, tamanho, placa, app compatível e resultado do roteiro de testes.

## Checklist de release

- [ ] Número alterado no componente modificado.
- [ ] Firmware compilado sem erro e tamanho da partição conferido.
- [ ] `flutter analyze` e `flutter test` executados.
- [ ] Firmware gravado e inicialização observada no monitor serial.
- [ ] BLE conecta, desconecta e reconecta.
- [ ] Áudio toca sem reinício; volume e progresso funcionam.
- [ ] LEDs, vibração e pânico funcionam.
- [ ] Inventário do SD corresponde aos arquivos reais.
- [ ] Instalação e exclusão múltiplas testadas.
- [ ] Face instalada aparece, é exibida e persiste após reinício.
- [ ] OTA só oferece versão superior e conclui com a versão esperada.
- [ ] Catálogos, tamanhos e checksums validados.
- [ ] APK e BIN copiados para `releases/` e publicados.

## Diagnóstico

Use o monitor serial a 115200 baud. Para falhas de hardware isoladas, consulte `examples/cyd_diagnostic/` e `diagnostics/`. Não diagnostique reset apenas pela tela: registre causa de reset, heap livre, estado do SD e última operação serial.

## Dívida técnica a respeitar

O firmware já está muito próximo do limite da partição OTA. Antes de adicionar módulos grandes, medir o binário e remover código/telas legadas não usados. Alterar a tabela de partição exige cuidado porque pode invalidar a atualização OTA de unidades já instaladas.
