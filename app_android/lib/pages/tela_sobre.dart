// lib/pages/tela_sobre.dart

import 'package:flutter/material.dart';
import 'dart:math';

import '../widgets/pagina_base.dart';
import '../widgets/botao_verde.dart';

class TelaSobre extends StatelessWidget {
  const TelaSobre({super.key});

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Stack(
        children: [
          // Fundo animado com estrelas piscando para dar o tema cósmico
          const _EstrelasPiscandoFundo(),

          Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 40),

                      // 1. Imagem do Fefo em destaque
                      Image.asset(
                        'assets/images/fefo.png',
                        height: MediaQuery.of(context).size.height * 0.25,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 20),

                      // 2. Título da Página
                      const Text(
                        'Quem é o Fefo?',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'Billotilde',
                          fontSize: 55,
                          height: 1.1,
                          color: Color(0xFF318134),
                          shadows: [
                            Shadow(
                              blurRadius: 10.0,
                              color: Colors.white,
                              offset: Offset(0, 0),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 25),

                      // Selo da Versão do Aplicativo
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color:
                              const Color(0xFFDC4900).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: const Color(0xFFDC4900), width: 1.5),
                        ),
                        child: const Text(
                          'Versão do App: FEFO App v068 (1.0.68+68)',
                          style: TextStyle(
                            fontFamily: 'KGPen',
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFDC4900),
                          ),
                        ),
                      ),

                      const SizedBox(height: 25),

                      // 3. O Texto da História do Fefo
                      RichText(
                        textAlign: TextAlign.center,
                        text: const TextSpan(
                          style: TextStyle(
                            fontFamily: 'KGPen',
                            fontSize: 22,
                            color: Color.fromARGB(255, 61, 61, 61),
                            height: 1.5, // Espaçamento entre linhas
                          ),
                          children: [
                            // Primeiro parágrafo
                            TextSpan(
                                text:
                                    'Direto do Planeta Lumora, onde as emoções brilham como estrelas, Fefo chegou à Terra com uma missão mágica: ser um amigo sensorial para as crianças especiais.'),

                            // Emoji separador
                            TextSpan(
                                text: '\n\n✨ 💖 ✨\n\n',
                                style: TextStyle(fontSize: 26, height: 1.2)),

                            // Segundo parágrafo
                            TextSpan(
                                text:
                                    'Ele sente, entende e acolhe com carinho, ajudando a acalmar, expressar sentimentos e espalhar afeto.'),

                            // Emoji separador
                            TextSpan(
                                text: '\n\n🪐\n\n',
                                style: TextStyle(fontSize: 26, height: 1.2)),

                            // Terceiro parágrafo
                            TextSpan(
                                text:
                                    'Um verdadeiro Guardião das Emoções, Fefo é um pedacinho de amor cósmico em forma de pet.'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),

              // 4. Botão de Voltar
              Padding(
                padding: const EdgeInsets.only(bottom: 15.0, top: 15.0),
                child: BotaoVerde(
                  texto: 'Voltar',
                  larguraPercentual: 0.72,
                  aoPressionar: () => Navigator.pop(context),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Widget auxiliar para criar o fundo animado de estrelas
class _EstrelasPiscandoFundo extends StatefulWidget {
  const _EstrelasPiscandoFundo();

  @override
  State<_EstrelasPiscandoFundo> createState() => _EstrelasPiscandoFundoState();
}

class _EstrelasPiscandoFundoState extends State<_EstrelasPiscandoFundo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<_Estrela> _estrelas;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    )..repeat(); // A animação se repete continuamente

    // ========================================================
    // OTIMIZAÇÃO APLICADA AQUI
    // O número de estrelas foi reduzido de 50 para 25 para
    // aliviar a carga de processamento e evitar travamentos.
    // ========================================================
    _estrelas = List.generate(25, (index) => _Estrela.aleatoria());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          size: Size.infinite,
          painter: _EstrelasPainter(
              estrelas: _estrelas, progresso: _controller.value),
        );
      },
    );
  }
}

// Classe que desenha as estrelas na tela
class _EstrelasPainter extends CustomPainter {
  final List<_Estrela> estrelas;
  final double progresso;

  _EstrelasPainter({required this.estrelas, required this.progresso});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white;

    for (var estrela in estrelas) {
      // O 'fatorPisca' cria a animação de piscar em momentos diferentes para cada estrela
      final fatorPisca = sin((progresso * 2 * pi) + estrela.fase) * 0.5 + 0.5;
      paint.color =
          Colors.white.withOpacity(fatorPisca * estrela.opacidadeBase);
      canvas.drawCircle(
        Offset(estrela.x * size.width, estrela.y * size.height),
        estrela.tamanho,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _EstrelasPainter oldDelegate) {
    return progresso !=
        oldDelegate.progresso; // Redesenha a cada frame da animação
  }
}

// Classe de dados para cada estrela
class _Estrela {
  final double x; // Posição horizontal (0.0 a 1.0)
  final double y; // Posição vertical (0.0 a 1.0)
  final double tamanho;
  final double opacidadeBase;
  final double
      fase; // Deslocamento na animação para que não pisquem todas juntas

  _Estrela(
      {required this.x,
      required this.y,
      required this.tamanho,
      required this.opacidadeBase,
      required this.fase});

  factory _Estrela.aleatoria() {
    final random = Random();
    return _Estrela(
      x: random.nextDouble(),
      y: random.nextDouble(),
      tamanho:
          random.nextDouble() * 1.5 + 0.5, // Tamanhos variados de 0.5 a 2.0
      opacidadeBase:
          random.nextDouble() * 0.5 + 0.2, // Opacidade variada de 0.2 a 0.7
      fase: random.nextDouble() * 2 * pi, // Fase aleatória para piscar
    );
  }
}
