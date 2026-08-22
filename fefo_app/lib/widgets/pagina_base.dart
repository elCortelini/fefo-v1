import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'fundo_fefo.dart';
import 'mini_player.dart';
import '../theme/fefo_theme.dart';
import '../design_system/fefo_tokens.dart';
import '../config/fefo_routes.dart';

class PaginaBase extends StatelessWidget {
  final Widget child;
  final bool mostrarBotaoVoltar;
  final ValueChanged<int>? onNavegacao;
  final int indiceNavegacao;
  final bool mostrarNavegacao;

  const PaginaBase({
    super.key,
    required this.child,
    this.mostrarBotaoVoltar = false,
    this.onNavegacao,
    this.indiceNavegacao = 0,
    this.mostrarNavegacao = false,
  });

  @override
  Widget build(BuildContext context) {
    final fefoTheme = context.watch<FefoThemeController>().current;
    final tokens = Theme.of(context).extension<FefoTokens>();

    return Scaffold(
      bottomNavigationBar: !mostrarNavegacao
          ? null
          : NavigationBar(
              selectedIndex: indiceNavegacao,
              onDestinationSelected: onNavegacao ??
                  (index) {
                    const routes = [
                      FefoRoutes.home,
                      FefoRoutes.favorites,
                      FefoRoutes.contents,
                      FefoRoutes.settings,
                    ];
                    if (index == indiceNavegacao) return;
                    Navigator.of(context).pushReplacementNamed(routes[index]);
                  },
              destinations: const [
                NavigationDestination(
                    icon: Icon(Icons.home_rounded), label: 'Início'),
                NavigationDestination(
                    icon: Icon(Icons.star_rounded), label: 'Favoritos'),
                NavigationDestination(
                    icon: Icon(Icons.library_music_rounded),
                    label: 'Conteúdos'),
                NavigationDestination(
                    icon: Icon(Icons.settings_rounded), label: 'Configurações'),
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
              padding:
                  EdgeInsets.symmetric(horizontal: tokens?.pagePadding ?? 20),
              child: Center(
                child: ConstrainedBox(
                  constraints:
                      BoxConstraints(maxWidth: tokens?.contentMaxWidth ?? 720),
                  child: Column(
                    children: [
                      Expanded(child: child),
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
