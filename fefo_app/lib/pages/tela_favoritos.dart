import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../theme/fefo_theme.dart';

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
              const SizedBox(height: 18),
              Text('Favoritos',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontFamily: 'Billotilde',
                      fontSize: 52,
                      color: Theme.of(context).colorScheme.secondary)),
              const SizedBox(height: 8),
              Text('Seus conteúdos favoritos',
                  style: TextStyle(
                      fontFamily: 'Billotilde',
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.secondary)),
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
                          return Card(
                              child: ListTile(
                            leading:
                                Icon(Icons.star_rounded, color: theme.accent),
                            title: Text(audio.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontFamily: 'KGPen', color: theme.text)),
                            subtitle: Text(audio.group,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: theme.mutedText)),
                            trailing: IconButton(
                                icon: Icon(Icons.play_arrow_rounded,
                                    color: theme.accentSecondary),
                                onPressed: manager.isConnected
                                    ? () => manager.playAudio(audio.token)
                                    : null),
                          ));
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
