import 'dart:ui';

import 'package:flutter/material.dart';

import 'botao_verde.dart';
import 'mini_player.dart';

class PaginaBase extends StatelessWidget {
  final Widget child;
  final bool mostrarBotaoVoltar;

  const PaginaBase({
    super.key,
    required this.child,
    this.mostrarBotaoVoltar = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              image: DecorationImage(
                image: AssetImage('assets/images/background.png'),
                fit: BoxFit.cover,
              ),
            ),
          ),
          BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 2, sigmaY: 2),
            child: ColoredBox(color: Colors.black.withAlpha(13)),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 700),
                  child: Column(
                    children: [
                      Expanded(
                        child: mostrarBotaoVoltar
                            ? Column(
                                children: [
                                  Expanded(child: child),
                                  Padding(
                                    padding: const EdgeInsets.only(
                                        top: 10, bottom: 15),
                                    child: BotaoVerde(
                                      texto: 'Voltar',
                                      larguraPercentual: 0.72,
                                      aoPressionar: () =>
                                          Navigator.pop(context),
                                    ),
                                  ),
                                ],
                              )
                            : child,
                      ),
                      const MiniPlayer(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
