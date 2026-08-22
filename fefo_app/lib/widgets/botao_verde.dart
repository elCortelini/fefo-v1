// lib/widgets/botao_verde.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'botao_pincelada.dart';
import '../theme/fefo_theme.dart';

class BotaoVerde extends StatelessWidget {
  // --- PROPRIEDADES ---
  final String texto;
  final VoidCallback aoPressionar;
  final double larguraPercentual;
  final Color? cor; // Parâmetro opcional para a cor de fundo

  // --- CONSTRUTOR CORRIGIDO ---
  const BotaoVerde({
    super.key,
    required this.texto,
    required this.aoPressionar,
    required this.larguraPercentual,
    this.cor, // Cor é opcional, não precisa de 'required Color color'
  });

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>().current;
    if (texto.trim().toLowerCase() == 'voltar') {
      return BotaoPincelada(
        texto: 'Voltar',
        cor: theme.accent,
        larguraPercentual: 0.72,
        aoPressionar: aoPressionar,
      );
    }
    return BotaoPincelada(
      texto: texto,
      cor: cor ?? theme.accent,
      larguraPercentual: larguraPercentual,
      fontSize: 36,
      aoPressionar: aoPressionar,
    );
  }
}
