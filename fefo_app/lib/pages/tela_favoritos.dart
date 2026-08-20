import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';

class TelaFavoritos extends StatelessWidget {
  const TelaFavoritos({super.key});

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Consumer<BluetoothManager>(
        builder: (context, manager, _) {
          final favoritos = manager.favoriteAudios;
          return Column(
            children: [
              const SizedBox(height: 18),
              const Text('Favoritos', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Billotilde', fontSize: 48, color: Color(0xFF318134))),
              const SizedBox(height: 8),
              const Text('Seus conteúdos favoritos', style: TextStyle(fontFamily: 'KGPen', fontSize: 16)),
              const SizedBox(height: 12),
              Expanded(
                child: favoritos.isEmpty
                    ? const Center(child: Text('Toque na estrela de um áudio para adicioná-lo aqui.', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'KGPen', fontSize: 18)))
                    : ListView.builder(
                        itemCount: favoritos.length,
                        itemBuilder: (context, index) {
                          final audio = favoritos[index];
                          return Card(child: ListTile(
                            leading: const Icon(Icons.star_rounded, color: Color(0xFFDC4900)),
                            title: Text(audio.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: 'KGPen')),
                            subtitle: Text(audio.group, maxLines: 1, overflow: TextOverflow.ellipsis),
                            trailing: IconButton(icon: const Icon(Icons.play_arrow_rounded), onPressed: manager.isConnected ? () => manager.playAudio(audio.token) : null),
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
