import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../theme/fefo_theme.dart';
import '../design_system/fefo_components.dart';

class TelaFavoritos extends StatelessWidget {
  const TelaFavoritos({super.key});

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      mostrarBotaoVoltar: true,
      indiceNavegacao: 1,
      child: Consumer<BluetoothManager>(
        builder: (context, manager, _) {
          final theme = context.watch<FefoThemeController>().current;
          final favoritos = manager.favoriteAudios;
          return Column(
            children: [
              const FefoPageHeader(
                title: 'Favoritos',
                subtitle: 'Seus conteúdos favoritos',
              ),
              const SizedBox(height: 12),
              Expanded(
                child: favoritos.isEmpty
                    ? Center(
                        child: Text(
                            'Toque na estrela de um áudio para adicioná-lo aqui.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontFamily: 'KGPen',
                                fontSize: 18,
                                color: theme.mutedText)))
                    : ListView.builder(
                        itemCount: favoritos.length,
                        itemBuilder: (context, index) {
                          final audio = favoritos[index];
                          return FefoContentCard(
                            title: audio.title,
                            subtitle: audio.group,
                            icon: Icons.star_rounded,
                            actionIcon: Icons.play_arrow_rounded,
                            onTap: manager.isConnected ? () => manager.playAudio(audio.token) : null,
                            onAction: manager.isConnected ? () => manager.playAudio(audio.token) : null,
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
