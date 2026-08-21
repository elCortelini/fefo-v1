import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'botao_pincelada.dart';
import 'fundo_fefo.dart';
import 'mini_player.dart';
import '../theme/fefo_theme.dart';

class PaginaBase extends StatelessWidget {
  final Widget child;
  final bool mostrarBotaoVoltar;
  final ValueChanged<int>? onNavegacao;

  const PaginaBase({
    super.key,
    required this.child,
    this.mostrarBotaoVoltar = false,
    this.onNavegacao,
  });

  @override
  Widget build(BuildContext context) {
    final fefoTheme = context.watch<FefoThemeController>().current;

    return Scaffold(
      bottomNavigationBar: onNavegacao == null
          ? null
          : NavigationBar(
              selectedIndex: 0,
              onDestinationSelected: onNavegacao,
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Início'),
                NavigationDestination(icon: Icon(Icons.star_rounded), label: 'Favoritos'),
                NavigationDestination(icon: Icon(Icons.library_music_rounded), label: 'Conteúdos'),
                NavigationDestination(icon: Icon(Icons.settings_rounded), label: 'Configurações'),
              ],
            ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          FundoFefo(theme: fefoTheme),
          if (!fefoTheme.useLegacyImage)
            ColoredBox(color: fefoTheme.background.withValues(alpha: 0.08)),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 700),
                  child: Column(
                    children: [
                      Expanded(child: child),
                      const MiniPlayer(),
                      if (mostrarBotaoVoltar)
                        Padding(
                          padding: const EdgeInsets.only(top: 8, bottom: 12),
                          child: BotaoPincelada(
                            texto: 'Voltar',
                            cor: const Color(0xFFDC4900),
                            larguraPercentual: 0.72,
                            aoPressionar: () => Navigator.pop(context),
                          ),
                        ),
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
