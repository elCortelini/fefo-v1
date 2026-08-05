// lib/pages/tela_contos.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
// O BotaoVerde não é mais necessário aqui, pois a PaginaBase cuida dele.

// Estrutura para os dados de um player
class InfoPlayerConto {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayerConto({required this.legenda, required this.caminhoAudio});
}

// Estrutura para agrupar uma seção de contos
class SecaoContos {
  final String titulo;
  final List<InfoPlayerConto> players;
  const SecaoContos({required this.titulo, required this.players});
}

class TelaContos extends StatelessWidget {
  // Construtor const para melhor performance
  const TelaContos({super.key});

  // Mapa de ícones para cada seção
  final Map<String, IconData> _iconesSecoes = const {
    'MINI AVENTURAS': Icons.auto_stories_outlined,
    'CONTOS ÉPICOS': Icons.menu_book,
  };

  // Lista centralizada com as seções e seus dados
  final List<SecaoContos> _secoes = const [
    // --- SEÇÃO MINI AVENTURAS ---
    SecaoContos(
      titulo: 'MINI AVENTURAS',
      players: [
        InfoPlayerConto(
            legenda: 'Mini Conto 01', caminhoAudio: '/contos/mini01.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 02', caminhoAudio: '/contos/mini02.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 03', caminhoAudio: '/contos/mini03.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 04', caminhoAudio: '/contos/mini04.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 05', caminhoAudio: '/contos/mini05.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 06', caminhoAudio: '/contos/mini06.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 07', caminhoAudio: '/contos/mini07.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 08', caminhoAudio: '/contos/mini08.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 09', caminhoAudio: '/contos/mini09.wav'),
        InfoPlayerConto(
            legenda: 'Mini Conto 10', caminhoAudio: '/contos/mini10.wav'),
      ],
    ),
    // --- SEÇÃO CONTOS ÉPICOS ---
    SecaoContos(
      titulo: 'CONTOS ÉPICOS',
      players: [
        InfoPlayerConto(
            legenda: 'Conto Épico 01', caminhoAudio: '/contos/epico01.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 02', caminhoAudio: '/contos/epico02.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 03', caminhoAudio: '/contos/epico03.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 04', caminhoAudio: '/contos/epico04.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 05', caminhoAudio: '/contos/epico05.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 06', caminhoAudio: '/contos/epico06.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 07', caminhoAudio: '/contos/epico07.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 08', caminhoAudio: '/contos/epico08.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 09', caminhoAudio: '/contos/epico09.wav'),
        InfoPlayerConto(
            legenda: 'Conto Épico 10', caminhoAudio: '/contos/epico10.wav'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // A PaginaBase agora controla o botão "Voltar"
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Column(
        children: [
          const SizedBox(height: 25),
          // Título da Página
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Contos do Fefo',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 55,
                  height: 1.0,
                  color: Color(0xFF318134),
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          const SizedBox(height: 25),

          // LISTA DE CARDS EXPANSÍVEIS
          Expanded(
            // ================================================================
            //           <-- AQUI ESTÁ A CORREÇÃO DE LAYOUT -->
            // Adicionado Padding para criar um espaço no final da lista,
            // evitando que o conteúdo fique atrás do botão "Voltar".
            // ================================================================
            child: Padding(
              padding: const EdgeInsets.only(bottom: 90.0),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: _secoes.length,
                itemBuilder: (context, index) {
                  final secao = _secoes[index];
                  final icone = _iconesSecoes[secao.titulo] ?? Icons.book;
                  return _CardContoExpansivel(secao: secao, icone: icone);
                },
              ),
            ),
          ),
          // O botão "Voltar" foi removido daqui e agora é controlado pela PaginaBase
        ],
      ),
    );
  }
}

/// Widget reutilizável para o Card expansível de cada seção de contos.
class _CardContoExpansivel extends StatelessWidget {
  final SecaoContos secao;
  final IconData icone;

  const _CardContoExpansivel({required this.secao, required this.icone});

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
          color: const Color(0xFFDC4900), // Laranja para combinar com o tema
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
