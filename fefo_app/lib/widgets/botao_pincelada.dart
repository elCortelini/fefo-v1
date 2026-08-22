import 'dart:math';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme/fefo_theme.dart';

class BotaoPincelada extends StatefulWidget {
  final String texto;
  final VoidCallback aoPressionar;
  final Color cor;
  final double larguraPercentual;
  final double? fontSize;
  final Color? corBorda;
  final IconData? icone;

  const BotaoPincelada({
    super.key,
    required this.texto,
    required this.aoPressionar,
    this.cor = const Color(0xFFDC4900),
    this.larguraPercentual = 0.9,
    this.fontSize,
    this.corBorda,
    this.icone,
  });

  @override
  State<BotaoPincelada> createState() => _BotaoPinceladaState();
}

class _BotaoPinceladaState extends State<BotaoPincelada> {
  final _player = AudioPlayer();
  bool _pressionado = false;

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
    if (widget.texto.trim().toLowerCase() == 'voltar') {
      return const SizedBox.shrink();
    }
    final theme = context.watch<FefoThemeController>().current;
    final corTematica = widget.cor == const Color(0xFF318134) ||
            widget.cor == const Color(0xFFDC4900)
        ? theme.accent
        : widget.cor;
    final tamanhoFonte = widget.fontSize ?? 47;

    return LayoutBuilder(
      builder: (context, constraints) {
        final limiteDaTela =
            MediaQuery.sizeOf(context).width * widget.larguraPercentual;
        final larguraMaxima = min(constraints.maxWidth, limiteDaTela);
        final medidor = TextPainter(
          text: TextSpan(
            text: widget.texto,
            style: TextStyle(
              fontFamily: 'Billotilde',
              fontSize: tamanhoFonte,
              height: 0.9,
            ),
          ),
          textDirection: TextDirection.ltr,
          textAlign: TextAlign.center,
          maxLines: 4,
        )..layout(maxWidth: max(120, larguraMaxima - 58));

        final largura = min(
          larguraMaxima,
          max(180.0, medidor.width + (widget.icone == null ? 68 : 118)),
        );
        final altura = max(70.0, medidor.height + 34);

        return Center(
          child: GestureDetector(
            onTapDown: (_) => setState(() => _pressionado = true),
            onTapCancel: () => setState(() => _pressionado = false),
            onTapUp: (_) {
              setState(() => _pressionado = false);
              _tocarSom();
              widget.aoPressionar();
            },
            child: AnimatedScale(
              scale: _pressionado ? 0.97 : 1,
              duration: const Duration(milliseconds: 80),
              child: CustomPaint(
                painter: _PinceladaPainter(
                  cor: corTematica,
                  corBorda: widget.corBorda,
                ),
                child: SizedBox(
                  width: largura,
                  height: altura,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 30,
                      vertical: 14,
                    ),
                    child: Center(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (widget.icone != null) ...[
                              Icon(widget.icone,
                                  color: Colors.white,
                                  size: tamanhoFonte * .72),
                              const SizedBox(width: 12),
                            ],
                            Text(
                              widget.texto,
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              softWrap: false,
                              style: TextStyle(
                                fontFamily: 'Billotilde',
                                color: Colors.white,
                                fontSize: tamanhoFonte,
                                height: 0.9,
                                shadows: const [
                                  Shadow(
                                    color: Colors.black38,
                                    offset: Offset(1, 2),
                                    blurRadius: 3,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PinceladaPainter extends CustomPainter {
  final Color cor;
  final Color? corBorda;

  const _PinceladaPainter({required this.cor, this.corBorda});

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width * 0.035, size.height * 0.18)
      ..cubicTo(size.width * 0.18, size.height * 0.02, size.width * 0.45,
          size.height * 0.13, size.width * 0.68, size.height * 0.07)
      ..cubicTo(size.width * 0.87, size.height * 0.04, size.width * 0.98,
          size.height * 0.16, size.width * 0.965, size.height * 0.43)
      ..cubicTo(size.width, size.height * 0.63, size.width * 0.94,
          size.height * 0.91, size.width * 0.72, size.height * 0.87)
      ..cubicTo(size.width * 0.48, size.height * 0.96, size.width * 0.23,
          size.height * 0.82, size.width * 0.04, size.height * 0.91)
      ..cubicTo(size.width * 0.015, size.height * 0.7, size.width * 0.005,
          size.height * 0.39, size.width * 0.035, size.height * 0.18)
      ..close();

    final paint = Paint()
      ..shader = LinearGradient(
        colors: [
          Color.lerp(cor, Colors.orangeAccent, 0.18)!,
          cor,
          Color.lerp(cor, Colors.white, 0.16)!,
        ],
        stops: const [0, 0.72, 1],
        begin: Alignment.centerLeft,
        end: Alignment.bottomRight,
      ).createShader(Offset.zero & size)
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, paint);

    if (corBorda != null) {
      canvas.drawPath(
        path,
        Paint()
          ..color = corBorda!
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _PinceladaPainter oldDelegate) =>
      oldDelegate.cor != cor || oldDelegate.corBorda != corBorda;
}
