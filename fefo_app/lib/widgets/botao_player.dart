import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import 'progresso_operacao.dart';
import '../theme/fefo_theme.dart';
import '../design_system/fefo_components.dart';

class BotaoPlayer extends StatelessWidget {
  final String caminhoArquivoPlay;
  final String legenda;
  final double larguraIcone;
  final VoidCallback? aoExcluir;
  final bool deletando;
  final double progressoDelete;
  final String subtitulo;

  const BotaoPlayer({
    super.key,
    required this.caminhoArquivoPlay,
    required this.legenda,
    this.larguraIcone = 60.0,
    this.aoExcluir,
    this.deletando = false,
    this.progressoDelete = 0,
    this.subtitulo = 'Áudio do FEFO',
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<BluetoothManager>(
      builder: (context, manager, _) {
        final theme = context.watch<FefoThemeController>().current;
        final active = manager.audioRefAtivo(caminhoArquivoPlay);
        final enabled = manager.isConnected;

        if (!active) {
          return FefoContentCard(
            title: legenda,
            subtitle: subtitulo,
            icon: Icons.music_note_rounded,
            actionIcon: Icons.play_arrow_rounded,
            onTap: enabled
                ? () => manager.selecionarAudio(caminhoArquivoPlay)
                : null,
            onAction: enabled
                ? () => manager.selecionarAudio(caminhoArquivoPlay)
                : null,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: manager.isFavorite(caminhoArquivoPlay)
                      ? 'Remover favorito'
                      : 'Adicionar favorito',
                  icon: Icon(
                    manager.isFavorite(caminhoArquivoPlay)
                        ? Icons.star_rounded
                        : Icons.star_border_rounded,
                    color: theme.accent,
                  ),
                  onPressed: () =>
                      manager.alternarFavoritoPorCaminho(caminhoArquivoPlay),
                ),
                IconButton.filled(
                  tooltip: 'Tocar no FEFO',
                  onPressed: enabled
                      ? () => manager.selecionarAudio(caminhoArquivoPlay)
                      : null,
                  icon: const Icon(Icons.play_arrow_rounded),
                  style: IconButton.styleFrom(
                    backgroundColor: theme.accent,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          );
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(9, 8, 9, 9),
          decoration: BoxDecoration(
            color: theme.surface,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      legenda,
                      style: TextStyle(
                        fontFamily: 'KGPen',
                        fontSize: 31,
                        color: theme.mutedText,
                        height: 1.05,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: manager.isFavorite(caminhoArquivoPlay)
                        ? 'Remover favorito'
                        : 'Adicionar favorito',
                    icon: Icon(
                      manager.isFavorite(caminhoArquivoPlay)
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: theme.accent,
                    ),
                    onPressed: () =>
                        manager.alternarFavoritoPorCaminho(caminhoArquivoPlay),
                  ),
                  _AnimatedPlayingIcon(color: theme.accentSecondary),
                ],
              ),
              const SizedBox(height: 3),
              _PlaybackProgress(value: manager.audioProgress),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _ControlButton(
                    tooltip: manager.audioPaused ? 'Continuar' : 'Reproduzir',
                    icon: Icons.play_arrow_rounded,
                    color: theme.text,
                    active: manager.audioPlaying,
                    size: 48,
                    onPressed: !enabled
                        ? null
                        : manager.audioPaused
                            ? manager.resumeAudio
                            : () => manager.playAudio(caminhoArquivoPlay),
                  ),
                  _ControlButton(
                    tooltip: manager.audioPaused ? 'Retomar' : 'Pausar',
                    icon: Icons.pause_rounded,
                    color: theme.text,
                    active: manager.audioPaused,
                    size: 48,
                    onPressed: !enabled
                        ? null
                        : manager.audioPaused
                            ? manager.resumeAudio
                            : manager.pauseAudio,
                  ),
                  _ControlButton(
                    tooltip: 'Parar',
                    icon: Icons.stop_rounded,
                    color: theme.text,
                    active: manager.audioStopped,
                    size: 48,
                    onPressed: enabled ? manager.stopAudio : null,
                  ),
                  if (aoExcluir != null)
                    _ControlButton(
                      tooltip: 'Excluir do FEFO',
                      icon: Icons.delete_outline_rounded,
                      color: theme.text,
                      active: deletando,
                      size: 48,
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

class _AnimatedPlayingIcon extends StatefulWidget {
  final Color color;

  const _AnimatedPlayingIcon({required this.color});

  @override
  State<_AnimatedPlayingIcon> createState() => _AnimatedPlayingIconState();
}

class _AnimatedPlayingIconState extends State<_AnimatedPlayingIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) => Transform.scale(
        scale: 0.88 + (_controller.value * 0.2),
        child: Icon(Icons.graphic_eq_rounded, color: widget.color, size: 30),
      ),
    );
  }
}

class _PlaybackProgress extends StatelessWidget {
  final double value;

  const _PlaybackProgress({required this.value});

  void _onSeek(BuildContext context, Offset globalPosition, double maxWidth) {
    final box = context.findRenderObject() as RenderBox?;
    if (box == null) return;
    final local = box.globalToLocal(globalPosition);
    final pct = (local.dx / maxWidth).clamp(0.0, 1.0);
    context.read<BluetoothManager>().seekAudio(pct);
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>().current;
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        const marker = 22.0;
        final progress = value.clamp(0.0, 1.0);
        final left = (maxWidth - marker) * progress;

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (details) =>
              _onSeek(context, details.globalPosition, maxWidth),
          onPanUpdate: (details) =>
              _onSeek(context, details.globalPosition, maxWidth),
          child: SizedBox(
            height: 28,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: theme.accent.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: progress,
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: theme.accent,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                Positioned(
                  left: left,
                  child: Container(
                    width: marker,
                    height: marker,
                    decoration: BoxDecoration(
                      color: theme.text,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
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
    final activeColor = context.watch<FefoThemeController>().current.accent;
    final isEnabled = onPressed != null;

    return Tooltip(
      message: tooltip,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: active
              ? activeColor
              : (isEnabled
                  ? context
                      .watch<FefoThemeController>()
                      .current
                      .text
                      .withValues(alpha: 0.07)
                  : Colors.transparent),
          shape: BoxShape.circle,
        ),
        child: IconButton(
          onPressed: onPressed,
          visualDensity: VisualDensity.compact,
          iconSize: size,
          color: active ? Colors.white : color,
          disabledColor: color.withValues(alpha: 0.28),
          icon: Icon(icon),
        ),
      ),
    );
  }
}
