import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'botao_pincelada.dart';
import '../theme/fefo_theme.dart';

const Color corLaranja = Color(0xFFDC4900);
const Color corLaranjaClick = Color(0xFFF89261);
const Color corTextoBotao = Colors.white;

/// Compatibilidade para telas antigas, usando o mesmo padrão visual global.
class BotaoLaranja extends StatelessWidget {
  final String texto;
  final VoidCallback aoPressionar;
  final double? larguraPercentual;

  const BotaoLaranja({
    super.key,
    required this.texto,
    required this.aoPressionar,
    this.larguraPercentual,
  });

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>();
    return BotaoPincelada(
      texto: texto,
      cor: theme.current.accent,
      larguraPercentual: larguraPercentual ?? .9,
      fontSize: 36,
      aoPressionar: aoPressionar,
    );
  }
}
