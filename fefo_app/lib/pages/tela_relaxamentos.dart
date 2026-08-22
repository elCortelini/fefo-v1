// lib/pages/tela_relaxamentos.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

// Estrutura para os dados de um áudio de relaxamento
class InfoPlayerRelaxamento {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayerRelaxamento(
      {required this.legenda, required this.caminhoAudio});
}

class TelaRelaxamentos extends StatelessWidget {
  // Lista centralizada com todos os áudios
  final List<InfoPlayerRelaxamento> _audios = const [
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 01', caminhoAudio: '/relax/relax01.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 02', caminhoAudio: '/relax/relax02.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 03', caminhoAudio: '/relax/relax03.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 04', caminhoAudio: '/relax/relax04.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 05', caminhoAudio: '/relax/relax05.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 06', caminhoAudio: '/relax/relax06.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 07', caminhoAudio: '/relax/relax07.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 08', caminhoAudio: '/relax/relax08.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 09', caminhoAudio: '/relax/relax09.wav'),
    InfoPlayerRelaxamento(
        legenda: 'RELAXAMENTO 10', caminhoAudio: '/relax/relax10.wav'),
  ];

  TelaRelaxamentos({super.key});

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
                'Relaxamento',
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

          // Lista rolável com os áudios
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _audios.length,
              itemBuilder: (context, index) {
                final audio = _audios[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 15.0),
                  child: BotaoPlayer(
                    legenda: audio.legenda,
                    caminhoArquivoPlay: audio.caminhoAudio,
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
