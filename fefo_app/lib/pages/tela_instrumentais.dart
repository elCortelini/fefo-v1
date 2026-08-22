// lib/pages/tela_instrumentais.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
// O BotaoVerde não é mais necessário aqui, pois a PaginaBase cuida dele.

// Estrutura para os dados de um player
class InfoPlayerInstrumental {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayerInstrumental(
      {required this.legenda, required this.caminhoAudio});
}

// Estrutura para agrupar uma seção de sons
class SecaoInstrumentais {
  final String titulo;
  final List<InfoPlayerInstrumental> players;
  const SecaoInstrumentais({required this.titulo, required this.players});
}

class TelaInstrumentais extends StatelessWidget {
  // Construtor const para melhor performance
  const TelaInstrumentais({super.key});

  // Mapa de ícones para cada seção
  final Map<String, IconData> _iconesSecoes = const {
    'SONS DA NATUREZA': Icons.forest,
    'INSTRUMENTAIS': Icons.piano,
  };

  // Lista centralizada com os títulos em maiúsculas
  final List<SecaoInstrumentais> _secoes = const [
    // --- SEÇÃO SONS DA NATUREZA ---
    SecaoInstrumentais(
      titulo: 'SONS DA NATUREZA',
      players: [
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 01', caminhoAudio: '/instr/inst01.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 02', caminhoAudio: '/instr/inst02.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 03', caminhoAudio: '/instr/inst03.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 04', caminhoAudio: '/instr/inst04.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 05', caminhoAudio: '/instr/inst05.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 06', caminhoAudio: '/instr/inst06.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 07', caminhoAudio: '/instr/inst07.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 08', caminhoAudio: '/instr/inst08.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 09', caminhoAudio: '/instr/inst09.wav'),
        InfoPlayerInstrumental(
            legenda: 'NATUREZA 10', caminhoAudio: '/instr/inst10.wav'),
      ],
    ),
    // --- SEÇÃO INSTRUMENTAIS ---
    SecaoInstrumentais(
      titulo: 'INSTRUMENTAIS',
      players: [
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 01', caminhoAudio: '/instr/inst11.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 02', caminhoAudio: '/instr/inst12.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 03', caminhoAudio: '/instr/inst13.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 04', caminhoAudio: '/instr/inst14.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 05', caminhoAudio: '/instr/inst15.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 06', caminhoAudio: '/instr/inst16.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 07', caminhoAudio: '/instr/inst17.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 08', caminhoAudio: '/instr/inst18.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 09', caminhoAudio: '/instr/inst19.wav'),
        InfoPlayerInstrumental(
            legenda: 'INSTRUMENTAL 10', caminhoAudio: '/instr/inst20.wav'),
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
                'Instrumentais e Natureza',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 55,
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
                  return _CardInstrumentalExpansivel(
                      secao: secao, icone: icone);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Widget reutilizável para o Card expansível de cada seção.
class _CardInstrumentalExpansivel extends StatelessWidget {
  final SecaoInstrumentais secao;
  final IconData icone;

  const _CardInstrumentalExpansivel({required this.secao, required this.icone});

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
