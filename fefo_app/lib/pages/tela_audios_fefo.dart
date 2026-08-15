import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import '../widgets/controle_deslizante.dart';

class TelaAudiosFefo extends StatefulWidget {
  final String? grupoInicial;

  const TelaAudiosFefo({super.key, this.grupoInicial});

  @override
  State<TelaAudiosFefo> createState() => _TelaAudiosFefoState();
}

class _TelaAudiosFefoState extends State<TelaAudiosFefo> {
  bool _modoSelecao = false;
  final Set<String> _selecionados = {};

  void _toggleSelecao(String path) {
    setState(() {
      if (_selecionados.contains(path)) {
        _selecionados.remove(path);
      } else {
        _selecionados.add(path);
      }
    });
  }

  Future<void> _excluirSelecionados(BuildContext context) async {
    if (_selecionados.isEmpty) return;
    final count = _selecionados.length;
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text('Excluir $count áudio(s)?'),
            content: const Text(
              'Os arquivos selecionados serão removidos permanentemente do cartão do FEFO.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Excluir Todos'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed || !mounted) return;

    final paths = _selecionados.toList();
    try {
      await context
          .read<BluetoothManager>()
          .removerVariosAudiosPorWifi(paths);
      if (mounted) {
        setState(() {
          _selecionados.clear();
          _modoSelecao = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Áudios removidos com sucesso!'),
            backgroundColor: Color(0xFF318134),
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Não foi possível excluir os áudios: $error'),
          backgroundColor: Colors.red.shade800,
          duration: const Duration(seconds: 6),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color corVerde = Color(0xFF318134);
    const Color corLaranja = Color(0xFFDC4900);

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
            final groupNames = widget.grupoInicial == null
                ? (groups.keys.toList()..sort())
                : groups.containsKey(widget.grupoInicial)
                    ? [widget.grupoInicial!]
                    : <String>[];
            final audios = groupNames
                .expand((group) => groups[group] ?? const <FefoAudioItem>[])
                .toList();

            // Agrupar áudios por submenu
            final Map<String, List<FefoAudioItem>> submenusMap = {};
            for (final audio in audios) {
              submenusMap.putIfAbsent(audio.submenu, () => []).add(audio);
            }

            return Column(
              children: [
                const SizedBox(height: 25),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      widget.grupoInicial ?? 'Áudios no FEFO',
                      style: const TextStyle(
                        fontFamily: 'Billotilde',
                        fontSize: 55,
                        height: 1,
                        color: corVerde,
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
                              : ListView(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16),
                                  children: [
                                    for (final entry in submenusMap.entries) ...[
                                      if (entry.key.trim().isNotEmpty) ...[
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 15,
                                            bottom: 8,
                                            left: 4,
                                          ),
                                          child: Text(
                                            entry.key.trim(),
                                            style: const TextStyle(
                                              fontFamily: 'Billotilde',
                                              fontSize: 34,
                                              color: corVerde,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                      for (final audio in entry.value) ...[
                                        Padding(
                                          padding: const EdgeInsets.only(
                                              bottom: 10),
                                          child: Row(
                                            children: [
                                              if (_modoSelecao) ...[
                                                Checkbox(
                                                  value: _selecionados.contains(audio.path),
                                                  activeColor: corLaranja,
                                                  onChanged: (_) => _toggleSelecao(audio.path),
                                                ),
                                              ],
                                              Expanded(
                                                child: BotaoPlayer(
                                                  legenda: audio.title.isEmpty
                                                      ? audio.fileName
                                                      : audio.title,
                                                  caminhoArquivoPlay: audio.token,
                                                  larguraIcone: 38,
                                                  aoExcluir: _modoSelecao
                                                      ? null
                                                      : () => _confirmarExclusao(
                                                            context,
                                                            audio,
                                                          ),
                                                  deletando: manager.uploading &&
                                                      manager.operationPath ==
                                                          audio.path,
                                                  progressoDelete:
                                                      manager.uploadProgress,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ],
                                  ],
                                ),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 15, top: 15),
                  child: Column(
                    children: [
                      if (audios.isNotEmpty && manager.isConnected) ...[
                        if (!_modoSelecao)
                          BotaoPincelada(
                            texto: 'Deletar Múltiplos',
                            cor: Colors.red.shade800,
                            larguraPercentual: 0.72,
                            aoPressionar: () {
                              setState(() {
                                _modoSelecao = true;
                                _selecionados.clear();
                              });
                            },
                          )
                        else
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.red.shade800,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 12),
                                ),
                                icon: const Icon(Icons.delete_forever),
                                label: Text(
                                  'Excluir (${_selecionados.length})',
                                  style: const TextStyle(
                                    fontFamily: 'KGPen',
                                    fontSize: 18,
                                  ),
                                ),
                                onPressed: _selecionados.isEmpty
                                    ? null
                                    : () => _excluirSelecionados(context),
                              ),
                              const SizedBox(width: 12),
                              OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 12),
                                ),
                                onPressed: () {
                                  setState(() {
                                    _modoSelecao = false;
                                    _selecionados.clear();
                                  });
                                },
                                child: const Text(
                                  'Cancelar',
                                  style: TextStyle(
                                    fontFamily: 'KGPen',
                                    fontSize: 18,
                                    color: Colors.black87,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 10),
                      ],
                      BotaoPincelada(
                        texto: 'Voltar',
                        cor: corVerde,
                        larguraPercentual: 0.72,
                        aoPressionar: manager.uploading
                            ? () {}
                            : () => Navigator.pop(context),
                      ),
                    ],
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
              color: Colors.black,
              fontFamily: 'KGPen',
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
}
