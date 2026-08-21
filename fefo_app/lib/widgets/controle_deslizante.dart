import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme/fefo_theme.dart';

class ControleDeslizante extends StatelessWidget {
  final String titulo;
  final int valor;
  final ValueChanged<int> aoAlterar;
  final bool habilitado;

  const ControleDeslizante({
    super.key,
    required this.titulo,
    required this.valor,
    required this.aoAlterar,
    this.habilitado = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>().current;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
      child: Column(
        children: [
          Text(
            '$titulo: $valor%',
            style: TextStyle(
              fontFamily: 'KGPen',
              fontSize: 22,
              color: theme.mutedText,
            ),
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: theme.accent,
              inactiveTrackColor: theme.accent.withValues(alpha: 0.25),
              thumbColor: theme.accent,
              overlayColor: theme.accent.withValues(alpha: 0.2),
              trackHeight: 7,
            ),
            child: Slider(
              value: valor.clamp(0, 100).toDouble(),
              min: 0,
              max: 100,
              divisions: 100,
              onChanged: habilitado ? (v) => aoAlterar(v.round()) : null,
            ),
          ),
        ],
      ),
    );
  }
}
