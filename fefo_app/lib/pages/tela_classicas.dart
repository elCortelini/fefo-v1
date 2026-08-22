// lib/pages/tela_classicas.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
// O BotaoVerde não é mais necessário aqui, pois a PaginaBase cuida dele.

// Estrutura para os dados de um player de música clássica
class InfoPlayerClassica {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayerClassica({required this.legenda, required this.caminhoAudio});
}

// Estrutura para agrupar uma seção de músicas
class SecaoClassicas {
  final String titulo;
  final List<InfoPlayerClassica> players;
  const SecaoClassicas({required this.titulo, required this.players});
}

class TelaClassicas extends StatelessWidget {
  // Construtor const para melhor performance
  const TelaClassicas({super.key});

  // Mapa de ícones para cada seção
  final Map<String, IconData> _iconesSecoes = const {
    'RELAXA E ACALMA': Icons.self_improvement,
    // ==========================================================
    //                 <-- AQUI ESTÁ A CORREÇÃO -->
    // Trocado 'sentiment_calm' por 'bedtime', que é universal.
    // ==========================================================
    'DIMINUI A ANSIEDADE': Icons.bedtime,
    'CONCENTRAÇÃO E FOCO': Icons.psychology,
    'ESTIMULA A ALEGRIA': Icons.emoji_emotions,
  };

  // Lista centralizada com os títulos em maiúsculas
  final List<SecaoClassicas> _secoes = const [
    // --- SEÇÃO RELAXA E ACALMA ---
    SecaoClassicas(
      titulo: 'RELAXA E ACALMA',
      players: [
        InfoPlayerClassica(
            legenda: 'DEBUSSY - CLAIR DE LUNE',
            caminhoAudio: '/class/classica01.wav'),
        InfoPlayerClassica(
            legenda: 'ERIK SATIE - GYMNOPÉDIE Nº1',
            caminhoAudio: '/class/classica02.wav'),
        InfoPlayerClassica(
            legenda: 'BARBER - ADAGIO FOR STRINGS',
            caminhoAudio: '/class/classica03.wav'),
        InfoPlayerClassica(
            legenda: 'CHOPIN - NOCTURNE OP 9 Nº 2',
            caminhoAudio: '/class/classica04.wav'),
        InfoPlayerClassica(
            legenda: 'BACH - AIR ON THE G STRING',
            caminhoAudio: '/class/classica05.wav'),
      ],
    ),
    // --- SEÇÃO DIMINUI A ANSIEDADE ---
    SecaoClassicas(
      titulo: 'DIMINUI A ANSIEDADE',
      players: [
        InfoPlayerClassica(
            legenda: 'ARVO PÄRT - SPIEGEL IM SPIEGEL',
            caminhoAudio: '/class/classica06.wav'),
        InfoPlayerClassica(
            legenda: 'CHOPIN - PRELUDE IN E MINOR',
            caminhoAudio: '/class/classica07.wav'),
        InfoPlayerClassica(
            legenda: 'BEETHOVEN - MOONLIGHT SONATA (1º MOV.)',
            caminhoAudio: '/class/classica08.wav'),
        InfoPlayerClassica(
            legenda: 'MASSENET - MEDITATION DE THAÏS',
            caminhoAudio: '/class/classica09.wav'),
        InfoPlayerClassica(
            legenda: 'SCHUBERT - AVE MARIA',
            caminhoAudio: '/class/classica10.wav'),
      ],
    ),
    // --- SEÇÃO CONCENTRAÇÃO E FOCO ---
    SecaoClassicas(
      titulo: 'CONCENTRAÇÃO E FOCO',
      players: [
        InfoPlayerClassica(
            legenda: 'BACH - PRELÚDIO EM DÓ MAIOR',
            caminhoAudio: '/class/classica11.wav'),
        InfoPlayerClassica(
            legenda: 'MOZART - SONATA K. 545',
            caminhoAudio: '/class/classica12.wav'),
        InfoPlayerClassica(
            legenda: 'BEETHOVEN - FÜR ELISE',
            caminhoAudio: '/class/classica13.wav'),
        InfoPlayerClassica(
            legenda: 'BACH - BRANDENBURG CONCERTO NO. 3',
            caminhoAudio: '/class/classica14.wav'),
        InfoPlayerClassica(
            legenda: 'BACH - INVENTION NO. 13',
            caminhoAudio: '/class/classica15.wav'),
      ],
    ),
    // --- SEÇÃO ESTIMULA A ALEGRIA ---
    SecaoClassicas(
      titulo: 'ESTIMULA A ALEGRIA',
      players: [
        InfoPlayerClassica(
            legenda: 'MOZART - EINE KLEINE NACHTMUSIK',
            caminhoAudio: '/class/classica16.wav'),
        InfoPlayerClassica(
            legenda: 'BEETHOVEN - SINFONIA N.6 “PASTORAL” (1º MOV.)',
            caminhoAudio: '/class/classica17.wav'),
        InfoPlayerClassica(
            legenda: 'VIVALDI - THE FOUR SEASONS: SPRING',
            caminhoAudio: '/class/classica18.wav'),
        InfoPlayerClassica(
            legenda: 'STRAUSS - THE BLUE DANUBE',
            caminhoAudio: '/class/classica19.wav'),
        InfoPlayerClassica(
            legenda: 'STRAUSS - RADETZKY MARCH',
            caminhoAudio: '/class/classica20.wav'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // 1. PaginaBase agora é instruída a mostrar o botão "Voltar"
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Column(
        children: [
          const SizedBox(height: 25),
          // Título da Página
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Músicas Clássicas',
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

          // 2. LISTA DE CARDS EXPANSÍVEIS
          Expanded(
            // 3. Adicionado Padding para criar espaço no final da lista
            child: Padding(
              padding: const EdgeInsets.only(bottom: 90.0),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: _secoes.length,
                itemBuilder: (context, index) {
                  final secao = _secoes[index];
                  final icone = _iconesSecoes[secao.titulo] ??
                      Icons.music_note; // Ícone padrão
                  return _CardClassicaExpansivel(secao: secao, icone: icone);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Widget reutilizável para o Card expansível de cada seção de músicas.
class _CardClassicaExpansivel extends StatelessWidget {
  final SecaoClassicas secao;
  final IconData icone;

  const _CardClassicaExpansivel({required this.secao, required this.icone});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        leading: Icon(
          icone,
          size: 32,
          color: const Color(0xFFDC4900), // Laranja
        ),
        title: Text(
          secao.titulo,
          style: const TextStyle(
            fontFamily: 'KGPen',
            fontSize: 26,
            fontWeight: FontWeight.bold,
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: secao.players.map((player) {
                return Padding(
                  padding: const EdgeInsets.only(top: 12.0),
                  child: BotaoPlayer(
                    legenda: player.legenda,
                    caminhoArquivoPlay: player.caminhoAudio,
                    larguraIcone: 35,
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
