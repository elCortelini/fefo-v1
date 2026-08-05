import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import 'progresso_operacao.dart';

class BotaoPlayer extends StatelessWidget {
  final String caminhoArquivoPlay;
  final String legenda;
  final double larguraIcone;
  final VoidCallback? aoExcluir;
  final bool deletando;
  final double progressoDelete;

  const BotaoPlayer({
    super.key,
    required this.caminhoArquivoPlay,
    required this.legenda,
    this.larguraIcone = 60.0,
    this.aoExcluir,
    this.deletando = false,
    this.progressoDelete = 0,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<BluetoothManager>(
      builder: (context, manager, _) {
        final active = manager.audioSelecionado == caminhoArquivoPlay;
        final enabled = manager.isConnected;

        if (!active) {
          return InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: enabled
                ? () => manager.selecionarAudio(caminhoArquivoPlay)
                : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  legenda,
                  style: const TextStyle(
                    fontFamily: 'KGPen',
                    fontSize: 31,
                    color: Color(0xFF4B5563),
                    height: 1.05,
                  ),
                ),
              ),
            ),
          );
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(9, 8, 9, 9),
          decoration: BoxDecoration(
            color: const Color(0xFFFFD89A),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                legenda,
                style: const TextStyle(
                  fontFamily: 'KGPen',
                  fontSize: 31,
                  color: Color(0xFF4B5563),
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 3),
              _PlaybackProgress(value: manager.audioProgress),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _ControlButton(
                    tooltip: manager.audioPaused ? 'Continuar' : 'Reiniciar',
                    icon: Icons.play_arrow_rounded,
                    color: Colors.red,
                    active: manager.audioPlaying,
                    size: 48,
                    onPressed: !enabled
                        ? null
                        : manager.audioPaused
                            ? manager.resumeAudio
                            : () => manager.playAudio(caminhoArquivoPlay),
                  ),
                  _ControlButton(
                    tooltip: 'Pausar',
                    icon: Icons.pause_rounded,
                    color: Colors.black,
                    active: manager.audioPaused,
                    size: 48,
                    onPressed: enabled && !manager.audioPaused
                        ? manager.pauseAudio
                        : null,
                  ),
                  _ControlButton(
                    tooltip: 'Parar',
                    icon: Icons.stop_rounded,
                    color: Colors.black,
                    active: manager.audioStopped,
                    size: 48,
                    onPressed: enabled ? manager.stopAudio : null,
                  ),
                  if (aoExcluir != null)
                    _ControlButton(
                      tooltip: 'Excluir do FEFO',
                      icon: Icons.delete_outline_rounded,
                      color: Colors.red,
                      active: false,
                      size: 43,
                      onPressed: enabled && !deletando ? aoExcluir : null,
                    ),
                ],
              ),
              if (deletando) ...[
                const SizedBox(height: 4),
                ProgressoOperacao(
                  status: 'Deletando',
                  progresso: progressoDelete,
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _PlaybackProgress extends StatelessWidget {
  final double value;

  const _PlaybackProgress({required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 22,
      child: LayoutBuilder(
        builder: (context, constraints) {
          const marker = 22.0;
          final progress = value.clamp(0.0, 1.0);
          final left = (constraints.maxWidth - marker) * progress;
          return Stack(
            alignment: Alignment.centerLeft,
            children: [
              Positioned(
                left: marker / 2,
                right: 0,
                child: Container(height: 3, color: const Color(0xFFFFA24B)),
              ),
              Positioned(
                left: left,
                child: Container(
                  width: marker,
                  height: marker,
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final String tooltip;
  final IconData icon;
  final Color color;
  final double size;
  final bool active;
  final VoidCallback? onPressed;

  const _ControlButton({
    required this.tooltip,
    required this.icon,
    required this.color,
    required this.size,
    required this.active,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      visualDensity: VisualDensity.compact,
      iconSize: size,
      color: active ? const Color(0xFFDC4900) : color,
      disabledColor: color.withValues(alpha: 0.28),
      icon: Icon(icon),
    );
  }
}
