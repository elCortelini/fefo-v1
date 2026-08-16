import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';

class TelaAudiosFefo extends StatefulWidget {
  final String? grupoInicial;

  const TelaAudiosFefo({super.key, this.grupoInicial});

  @override
  State<TelaAudiosFefo> createState() => _TelaAudiosFefoState();
}

class _TelaAudiosFefoState extends State<TelaAudiosFefo> {
  final Set<String> _selecionados = {};
  bool _modoSelecao = false;

  void _toggleSelecao(String path) {
    setState(() {
      if (_selecionados.contains(path)) {
        _selecionados.remove(path);
        if (_selecionados.isEmpty && _modoSelecao) {
          // Mantém o modo seleção ativo ou fecha se o usuário desejar
        }
      } else {
        _selecionados.add(path);
      }
    });
  }

  void _alternarModoSelecao() {
    setState(() {
      _modoSelecao = !_modoSelecao;
      if (!_modoSelecao) {
        _selecionados.clear();
      }
    });
  }

  void _selecionarTodos(List<FefoAudioItem> audios) {
    setState(() {
      if (_selecionados.length == audios.length) {
        _selecionados.clear();
      } else {
        _selecionados.clear();
        _selecionados.addAll(audios.map((a) => a.path));
      }
    });
  }

  Future<void> _excluirSelecionados(BuildContext context) async {
    if (_selecionados.isEmpty) return;
    final count = _selecionados.length;
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Text('Excluir $count áudio(s)?'),
            content: const Text(
              'Os arquivos selecionados serão removidos permanentemente do cartão do FEFO.',
              style: TextStyle(fontFamily: 'KGPen'),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancelar', style: TextStyle(fontFamily: 'KGPen')),
              ),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: Colors.red.shade800),
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Excluir Todos', style: TextStyle(fontFamily: 'KGPen')),
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
          .removerVariosAudios(paths);
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
                const SizedBox(height: 20),
                // Cabeçalho do Menu com Botão de Seleção Múltipla
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            widget.grupoInicial ?? 'Áudios no FEFO',
                            style: const TextStyle(
                              fontFamily: 'Billotilde',
                              fontSize: 52,
                              height: 1,
                              color: corVerde,
                            ),
                          ),
                        ),
                      ),
                      if (audios.isNotEmpty && manager.isConnected) ...[
                        IconButton(
                          tooltip: _modoSelecao
                              ? 'Sair da Seleção'
                              : 'Seleção Múltipla',
                          icon: Icon(
                            _modoSelecao
                                ? Icons.close_rounded
                                : Icons.checklist_rounded,
                            color: _modoSelecao ? Colors.red : corLaranja,
                            size: 32,
                          ),
                          onPressed: _alternarModoSelecao,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Bar de ação superior quando no modo de seleção
                if (_modoSelecao) ...[
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: corLaranja.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: corLaranja, width: 1.5),
                    ),
                    child: Row(
                      children: [
                        Text(
                          '${_selecionados.length} selecionado(s)',
                          style: const TextStyle(
                            fontFamily: 'KGPen',
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: corLaranja,
                          ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => _selecionarTodos(audios),
                          child: Text(
                            _selecionados.length == audios.length
                                ? 'Desmarcar Todos'
                                : 'Selecionar Todos',
                            style: const TextStyle(
                              fontFamily: 'KGPen',
                              fontSize: 15,
                              color: corVerde,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

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
                                      horizontal: 16, vertical: 8),
                                  children: [
                                    for (final entry in submenusMap.entries) ...[
                                      if (entry.key.trim().isNotEmpty) ...[
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 12,
                                            bottom: 6,
                                            left: 4,
                                          ),
                                          child: Text(
                                            entry.key.trim(),
                                            style: const TextStyle(
                                              fontFamily: 'Billotilde',
                                              fontSize: 32,
                                              color: corVerde,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                      for (final audio in entry.value) ...[
                                        _CardAudioItem(
                                          audio: audio,
                                          modoSelecao: _modoSelecao,
                                          selecionado: _selecionados.contains(audio.path),
                                          tocando: manager.caminhoAudioAtivo == audio.token ||
                                              manager.caminhoAudioAtivo == audio.path,
                                          onTap: () {
                                            if (_modoSelecao) {
                                              _toggleSelecao(audio.path);
                                            } else {
                                              manager.selecionarAudio(audio.token);
                                            }
                                          },
                                          onLongPress: () {
                                            if (!_modoSelecao) {
                                              setState(() {
                                                _modoSelecao = true;
                                                _selecionados.add(audio.path);
                                              });
                                            }
                                          },
                                        ),
                                      ],
                                    ],
                                  ],
                                ),
                ),

                // Painel de ação inferior para exclusão em lote
                Padding(
                  padding: const EdgeInsets.only(bottom: 12, top: 8),
                  child: Column(
                    children: [
                      if (_selecionados.isNotEmpty && manager.isConnected) ...[
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade800,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 24, vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(25),
                              ),
                              elevation: 4,
                            ),
                            icon: const Icon(Icons.delete_forever_rounded, size: 26),
                            label: Text(
                              'Deletar ${_selecionados.length} Selecionado(s)',
                              style: const TextStyle(
                                fontFamily: 'KGPen',
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            onPressed: () => _excluirSelecionados(context),
                          ),
                        ),
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

/// Card elegante para cada item de áudio da lista
class _CardAudioItem extends StatelessWidget {
  final FefoAudioItem audio;
  final bool modoSelecao;
  final bool selecionado;
  final bool tocando;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _CardAudioItem({
    required this.audio,
    required this.modoSelecao,
    required this.selecionado,
    required this.tocando,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    const corVerde = Color(0xFF318134);
    const corLaranja = Color(0xFFDC4900);

    final titulo = audio.title.isNotEmpty ? audio.title : audio.fileName;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: selecionado
            ? corLaranja.withValues(alpha: 0.15)
            : (tocando ? corVerde.withValues(alpha: 0.12) : Colors.white.withValues(alpha: 0.85)),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: selecionado
              ? corLaranja
              : (tocando ? corVerde : Colors.black12),
          width: selecionado || tocando ? 2 : 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
        onTap: onTap,
        onLongPress: onLongPress,
        leading: modoSelecao
            ? Icon(
                selecionado
                    ? Icons.check_circle_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selecionado ? corLaranja : Colors.grey,
                size: 28,
              )
            : CircleAvatar(
                backgroundColor: tocando ? corVerde : corLaranja.withValues(alpha: 0.15),
                child: Icon(
                  tocando ? Icons.volume_up_rounded : Icons.audiotrack_rounded,
                  color: tocando ? Colors.white : corLaranja,
                  size: 22,
                ),
              ),
        title: Text(
          titulo,
          style: TextStyle(
            fontFamily: 'KGPen',
            fontSize: 18,
            fontWeight: tocando || selecionado ? FontWeight.bold : FontWeight.normal,
            color: selecionado
                ? corLaranja
                : (tocando ? corVerde : Colors.black87),
          ),
        ),
        subtitle: audio.group.isNotEmpty
            ? Text(
                audio.group,
                style: const TextStyle(
                  fontFamily: 'KGPen',
                  fontSize: 13,
                  color: Colors.black54,
                ),
              )
            : null,
        trailing: modoSelecao
            ? null
            : IconButton(
                tooltip: 'Tocar no FEFO',
                icon: Icon(
                  tocando ? Icons.equalizer_rounded : Icons.play_circle_fill_rounded,
                  color: tocando ? corVerde : corLaranja,
                  size: 36,
                ),
                onPressed: onTap,
              ),
      ),
    );
  }
}

class _MensagemCentral extends StatelessWidget {
  final String texto;

  const _MensagemCentral({required this.texto});

  @override
  Widget build(BuildContext context) {
    return Center(
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
}
