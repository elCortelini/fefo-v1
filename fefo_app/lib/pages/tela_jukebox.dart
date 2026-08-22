// lib/pages/tela_jukebox.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

// Estrutura para os dados de uma música
class InfoPlayerJukebox {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayerJukebox({required this.legenda, required this.caminhoAudio});
}

class TelaJukebox extends StatelessWidget {
  // Lista centralizada com todas as músicas
  final List<InfoPlayerJukebox> _musicas = const [
    InfoPlayerJukebox(
        legenda: 'INFANTIL 01', caminhoAudio: '/jukeb/infant01.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 02', caminhoAudio: '/jukeb/infant02.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 03', caminhoAudio: '/jukeb/infant03.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 04', caminhoAudio: '/jukeb/infant04.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 05', caminhoAudio: '/jukeb/infant05.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 06', caminhoAudio: '/jukeb/infant06.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 07', caminhoAudio: '/jukeb/infant07.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 08', caminhoAudio: '/jukeb/infant08.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 09', caminhoAudio: '/jukeb/infant09.wav'),
    InfoPlayerJukebox(
        legenda: 'INFANTIL 10', caminhoAudio: '/jukeb/infant10.wav'),
  ];

  TelaJukebox({super.key});

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          const SizedBox(height: 25),
          // Título responsivo com FittedBox
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Jukebox do Fefo',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 52,
                  height: 1.0,
                  color: Theme.of(context).colorScheme.secondary,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          const SizedBox(height: 25),

          // Lista rolável com as músicas
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _musicas.length,
              itemBuilder: (context, index) {
                final musica = _musicas[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 15.0),
                  child: BotaoPlayer(
                    legenda: musica.legenda,
                    caminhoArquivoPlay: musica.caminhoAudio,
                    larguraIcone: 40,
                  ),
                );
              },
            ),
          ),

          // --- BOTÃO VOLTAR ---
          Padding(
            padding: const EdgeInsets.only(bottom: 15.0, top: 15.0),
            child: BotaoVerde(
              texto: 'Voltar',
              larguraPercentual: 0.5,
              aoPressionar: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}
