// lib/widgets/botao_verde.dart

import 'package:flutter/material.dart';

import 'botao_pincelada.dart';

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
    if (texto.trim().toLowerCase() == 'voltar') {
      return BotaoPincelada(
        texto: 'Voltar',
        cor: const Color(0xFF318134),
        larguraPercentual: 0.72,
        aoPressionar: aoPressionar,
      );
    }
    // Pega a largura total da tela
    final screenWidth = MediaQuery.of(context).size.width;

    return SizedBox(
      width: screenWidth * larguraPercentual,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          // --- LÓGICA DA COR ---
          // Se uma 'cor' for fornecida no construtor, use-a.
          // Senão, use a cor verde padrão.
          backgroundColor: cor ?? const Color(0xFF318134),
          padding: const EdgeInsets.symmetric(
              vertical: 12), // Reduzi o padding para acomodar melhor
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(50),
          ),
          elevation: 5,
        ),
        onPressed: aoPressionar,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            texto,
            maxLines: 1,
            softWrap: false,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 36,
              fontFamily: 'Billotilde',
              height: 1.1,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
