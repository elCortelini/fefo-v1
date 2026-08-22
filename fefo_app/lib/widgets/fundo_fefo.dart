import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/fefo_theme.dart';

class FundoFefo extends StatefulWidget {
  final FefoThemeDefinition theme;

  const FundoFefo({super.key, required this.theme});

  @override
  State<FundoFefo> createState() => _FundoFefoState();
}

class _FundoFefoState extends State<FundoFefo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 18),
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
      builder: (context, _) {
        final t = Curves.easeInOut.transform(_controller.value);
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.lerp(
                  const Alignment(0.7, -1.1), const Alignment(-0.2, -0.2), t)!,
              radius: 1.35,
              colors: [
                widget.theme.backgroundSecondary,
                widget.theme.background
              ],
              stops: const [0, 0.82],
            ),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Positioned(
                right: lerpDouble(-110, 30, t),
                top: lerpDouble(-95, 20, t),
                child: _orb(widget.theme.accent, 230, 0.13),
              ),
              Positioned(
                left: lerpDouble(-90, 30, 1 - t),
                bottom: lerpDouble(-100, 18, 1 - t),
                child: _orb(widget.theme.accentSecondary, 190, 0.1),
              ),
              BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 34, sigmaY: 34),
                child: ColoredBox(
                    color: widget.theme.background.withValues(alpha: 0.18)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _orb(Color color, double size, double opacity) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
          shape: BoxShape.circle, color: color.withValues(alpha: opacity)),
    );
  }
}
