import 'dart:math';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme/fefo_theme.dart';

/// Botão compatível com as telas legadas, agora renderizado pelo tema global.
class BotaoPincelada extends StatefulWidget {
  final String texto;
  final VoidCallback aoPressionar;
  final Color cor;
  final double larguraPercentual;
  final double? fontSize;
  final Color? corBorda;

  const BotaoPincelada({
    super.key,
    required this.texto,
    required this.aoPressionar,
    this.cor = const Color(0xFFDC4900),
    this.larguraPercentual = 0.9,
    this.fontSize,
    this.corBorda,
  });

  @override
  State<BotaoPincelada> createState() => _BotaoPinceladaState();
}

class _BotaoPinceladaState extends State<BotaoPincelada> {
  final _player = AudioPlayer();

  Future<void> _tocarSom() async {
    try {
      await _player.stop();
      await _player.play(
        AssetSource(
            ['sounds/miado.mp3', 'sounds/pru.mp3'][Random().nextInt(2)]),
        mode: PlayerMode.lowLatency,
      );
    } catch (_) {
      // O feedback local não pode bloquear a ação do botão.
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>().current;
    final isLegacyAccent = widget.cor == const Color(0xFF318134) ||
        widget.cor == const Color(0xFFDC4900);
    final color = isLegacyAccent ? theme.accent : widget.cor;
    final textColor =
        ThemeData.estimateBrightnessForColor(color) == Brightness.dark
            ? Colors.white
            : Colors.black87;

    return FractionallySizedBox(
      widthFactor: widget.larguraPercentual.clamp(.5, 1.0).toDouble(),
      child: SizedBox(
        height: max(52, (widget.fontSize ?? 18) + 28),
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: color,
            foregroundColor: textColor,
            side: widget.corBorda == null
                ? null
                : BorderSide(color: widget.corBorda!, width: 2),
          ),
          onPressed: () {
            _tocarSom();
            widget.aoPressionar();
          },
          child: Text(
            widget.texto,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                fontSize: widget.fontSize ?? 18, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}
