import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import '../widgets/controle_deslizante.dart';

class TelaAudiosFefo extends StatelessWidget {
  final String? grupoInicial;

  const TelaAudiosFefo({super.key, this.grupoInicial});

  @override
  Widget build(BuildContext context) {
    return PopScope<void>(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          final manager = context.read<BluetoothManager>();
          if (manager.isConnected) manager.stopAudio();
        }
      },
      child: PaginaBase(
        child: Consumer<BluetoothManager>(
          builder: (context, manager, child) {
            final groups = manager.audioGroups;
            final groupNames = grupoInicial == null
                ? (groups.keys.toList()..sort())
                : groups.containsKey(grupoInicial)
                    ? [grupoInicial!]
                    : <String>[];
            final audios = groupNames
                .expand((group) => groups[group] ?? const <FefoAudioItem>[])
                .toList();

            return Column(
              children: [
                const SizedBox(height: 25),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      grupoInicial ?? 'Áudios no FEFO',
                      style: const TextStyle(
                        fontFamily: 'Billotilde',
                        fontSize: 55,
                        height: 1,
                        color: Color(0xFF318134),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ControleDeslizante(
                  titulo: 'Volume',
                  valor: manager.audioVolume,
                  habilitado: manager.isConnected && !manager.uploading,
                  aoAlterar: manager.setVolume,
                ),
                Expanded(
                  child: manager.aguardandoReconexao
                      ? const _MensagemCentral(
                          texto: 'Concluído. Reconecte o Bluetooth.',
                        )
                      : !manager.isConnected && !manager.uploading
                          ? const _MensagemCentral(
                              texto:
                                  'Conecte ao FEFO para carregar os áudios do SDCard.',
                            )
                          : audios.isEmpty
                              ? const _MensagemCentral(
                                  texto: 'Nenhum áudio instalado neste menu.',
                                )
                              : ListView.builder(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16),
                                  itemCount: audios.length,
                                  itemBuilder: (context, index) {
                                    final audio = audios[index];
                                    final deleting = manager.uploading &&
                                        manager.operationPath == audio.path;
                                    return Padding(
                                      padding:
                                          const EdgeInsets.only(bottom: 10),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          BotaoPlayer(
                                            legenda: audio.title.isEmpty
                                                ? audio.fileName
                                                : audio.title,
                                            caminhoArquivoPlay: audio.token,
                                            larguraIcone: 38,
                                            aoExcluir: () => _confirmarExclusao(
                                              context,
                                              audio,
                                            ),
                                            deletando: deleting,
                                            progressoDelete:
                                                manager.uploadProgress,
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 15, top: 15),
                  child: BotaoPincelada(
                    texto: 'Voltar',
                    cor: const Color(0xFF318134),
                    larguraPercentual: 0.72,
                    aoPressionar: manager.uploading
                        ? () {}
                        : () => Navigator.pop(context),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

Future<void> _confirmarExclusao(
    BuildContext context, FefoAudioItem audio) async {
  final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Excluir áudio?'),
          content: Text(
            '${audio.title}\n\nO arquivo será removido do cartão do FEFO.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Excluir'),
            ),
          ],
        ),
      ) ??
      false;
  if (!confirmed || !context.mounted) return;
  try {
    await context.read<BluetoothManager>().removerAudioPorWifi(audio.path);
  } catch (error) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Não foi possível excluir o áudio: $error'),
        duration: const Duration(seconds: 6),
      ),
    );
  }
}

class _MensagemCentral extends StatelessWidget {
  final String texto;

  const _MensagemCentral({required this.texto});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            texto,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white70,
              fontFamily: 'KGPen',
              fontSize: 20,
            ),
          ),
        ),
      );
}
