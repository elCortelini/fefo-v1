import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import '../design_system/fefo_components.dart';

class TelaTeste extends StatelessWidget {
  const TelaTeste({super.key});

  Future<void> _selecionarEEnviar(
    BuildContext context, {
    required String pasta,
    required List<String> extensoes,
    String? destinoFixo,
  }) async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: extensoes,
      withData: true,
    );
    final arquivo = result?.files.single;
    final bytes = arquivo?.bytes;
    if (arquivo == null || bytes == null || !context.mounted) return;
    await context
        .read<BluetoothManager>()
        .enviarArquivo(destinoFixo ?? '$pasta${arquivo.name}', bytes);
  }

  @override
  Widget build(BuildContext context) {
    const verde = Color(0xFF318134);
    return PaginaBase(
      child: Consumer<BluetoothManager>(
        builder: (context, manager, _) {
          final firmware =
              (manager.firmwareVersion ?? '52').split('.').last.padLeft(3, '0');
          return SingleChildScrollView(
            child: Column(
              children: [
                const SizedBox(height: 24),
                Text(
                  'FEFO Firm v${firmware.split('.').last.padLeft(3, '0')} - App v038',
                  style: const TextStyle(
                    color: verde,
                    fontFamily: 'KGPen',
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Central de testes',
                  style: TextStyle(
                    fontFamily: 'Billotilde',
                    fontSize: 52,
                    color: Theme.of(context).colorScheme.secondary,
                  ),
                ),
                Text(
                  manager.statusMensagem,
                  style: TextStyle(
                    fontFamily: 'Billotilde',
                    fontSize: 21,
                    color: Theme.of(context).colorScheme.secondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (manager.uploading) ...[
                  const SizedBox(height: 12),
                  LinearProgressIndicator(value: manager.uploadProgress),
                ],
                const SizedBox(height: 20),
                _titulo('Efeitos de LED'),
                ...manager.ledEffects.map(
                  (item) => _comando(context, item.name, item.command),
                ),
                _titulo('Vibrações'),
                ...manager.vibrationEffects.map(
                  (item) => _comando(context, item.name, item.command),
                ),
                _titulo('Faces disponíveis'),
                ...manager.faces.map(
                  (item) => _comando(
                    context,
                    item.path,
                    'FACE ${item.path}',
                  ),
                ),
                _titulo('Atualizar conteúdo'),
                _acao(
                  'Atualizar fefo.json',
                  manager.atualizarCatalogo,
                ),
                _acao(
                  'Enviar nova face',
                  () => _selecionarEEnviar(
                    context,
                    pasta: '/usr/f/',
                    extensoes: const ['bmp'],
                  ),
                ),
                _acao(
                  'Enviar configuração LED',
                  () => _selecionarEEnviar(
                    context,
                    pasta: '/usr/c/',
                    extensoes: const ['json'],
                    destinoFixo: '/usr/c/led.json',
                  ),
                ),
                _acao(
                  'Enviar configuração de vibração',
                  () => _selecionarEEnviar(
                    context,
                    pasta: '/usr/c/',
                    extensoes: const ['json'],
                    destinoFixo: '/usr/c/vibration.json',
                  ),
                ),
                const SizedBox(height: 24),
                BotaoPincelada(
                  texto: 'Voltar',
                  cor: verde,
                  larguraPercentual: 0.5,
                  aoPressionar: () => Navigator.pop(context),
                ),
                const SizedBox(height: 35),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _titulo(String texto) => FefoSectionHeader(title: texto);

  Widget _comando(BuildContext context, String texto, String comando) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 5),
        child: BotaoPincelada(
          texto: texto,
          fontSize: 30,
          aoPressionar: () =>
              context.read<BluetoothManager>().enviarComando(comando),
        ),
      );

  Widget _acao(String texto, Future<void> Function() acao) => Padding(
        padding: const EdgeInsets.only(bottom: 5),
        child: BotaoPincelada(
          texto: texto,
          fontSize: 30,
          aoPressionar: acao,
        ),
      );
}
