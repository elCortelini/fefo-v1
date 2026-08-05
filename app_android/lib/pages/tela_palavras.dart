// lib/pages/tela_palavras.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
// O BotaoVerde não é mais necessário aqui, pois a PaginaBase cuida dele.

// Estruturas de dados (sem alteração)
class InfoPlayerPalavra {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayerPalavra({required this.legenda, required this.caminhoAudio});
}

class SecaoPalavras {
  final String titulo;
  final List<InfoPlayerPalavra> players;
  const SecaoPalavras({required this.titulo, required this.players});
}

class TelaPalavras extends StatelessWidget {
  // Construtor const para melhor performance
  const TelaPalavras({super.key});

  // Mapa de ícones para cada seção
  final Map<String, IconData> _iconesSecoes = const {
    'PALAVRAS MÁGICAS': Icons.auto_fix_high, // Ícone de varinha mágica
    'APOIO E INCENTIVO': Icons.thumb_up_alt, // Ícone de joinha
    'ATENÇÃO E LIMITES': Icons.campaign, // Ícone de megafone/aviso
  };

  // Lista de dados com títulos em maiúsculas para consistência
  final List<SecaoPalavras> _secoes = const [
    // --- SEÇÃO PALAVRAS MÁGICAS ---
    SecaoPalavras(
      titulo: 'PALAVRAS MÁGICAS',
      players: [
        InfoPlayerPalavra(
            legenda: 'Por favor', caminhoAudio: '/palavras/magica01.wav'),
        InfoPlayerPalavra(
            legenda: 'Obrigado', caminhoAudio: '/palavras/magica02.wav'),
        InfoPlayerPalavra(
            legenda: 'Desculpe', caminhoAudio: '/palavras/magica03.wav'),
        InfoPlayerPalavra(
            legenda: 'Com licença', caminhoAudio: '/palavras/magica04.wav'),
        InfoPlayerPalavra(
            legenda: 'Bom dia', caminhoAudio: '/palavras/magica05.wav'),
        InfoPlayerPalavra(
            legenda: 'Boa tarde', caminhoAudio: '/palavras/magica06.wav'),
        InfoPlayerPalavra(
            legenda: 'Boa noite', caminhoAudio: '/palavras/magica07.wav'),
        InfoPlayerPalavra(
            legenda: 'Até logo', caminhoAudio: '/palavras/magica08.wav'),
        InfoPlayerPalavra(
            legenda: 'Você é especial', caminhoAudio: '/palavras/magica09.wav'),
        InfoPlayerPalavra(
            legenda: 'Posso ajudar', caminhoAudio: '/palavras/magica10.wav'),
        InfoPlayerPalavra(
            legenda: 'Saber ouvir', caminhoAudio: '/palavras/magica11.wav'),
      ],
    ),
    // --- SEÇÃO APOIO E INCENTIVO ---
    SecaoPalavras(
      titulo: 'APOIO E INCENTIVO',
      players: [
        InfoPlayerPalavra(
            legenda: 'Tente fazer!', caminhoAudio: '/palavras/apoio01.wav'),
        InfoPlayerPalavra(
            legenda: 'Estou orgulhoso de você!',
            caminhoAudio: '/palavras/apoio02.wav'),
        InfoPlayerPalavra(
            legenda: 'Que incrível!', caminhoAudio: '/palavras/apoio03.wav'),
        InfoPlayerPalavra(
            legenda: 'Continue assim!', caminhoAudio: '/palavras/apoio04.wav'),
        InfoPlayerPalavra(
            legenda: 'Cada dia é aprendizado!',
            caminhoAudio: '/palavras/apoio05.wav'),
        InfoPlayerPalavra(
            legenda: 'Fico feliz por você!',
            caminhoAudio: '/palavras/apoio06.wav'),
        InfoPlayerPalavra(
            legenda: 'Vamos juntos!', caminhoAudio: '/palavras/apoio07.wav'),
        InfoPlayerPalavra(
            legenda: 'Dê seu melhor!', caminhoAudio: '/palavras/apoio08.wav'),
        InfoPlayerPalavra(
            legenda: 'Juntos somos mais fortes!',
            caminhoAudio: '/palavras/apoio09.wav'),
        InfoPlayerPalavra(
            legenda: 'Respire fundo!', caminhoAudio: '/palavras/apoio10.wav'),
        InfoPlayerPalavra(
            legenda: 'Voce conseguiu!', caminhoAudio: '/palavras/apoio11.wav'),
      ],
    ),
    // --- SEÇÃO ATENÇÃO E LIMITES ---
    SecaoPalavras(
      titulo: 'ATENÇÃO E LIMITES',
      players: [
        InfoPlayerPalavra(
            legenda: 'Fefo está observando!',
            caminhoAudio: '/palavras/limite01.wav'),
        InfoPlayerPalavra(
            legenda: 'Vamos ouvir!', caminhoAudio: '/palavras/limite02.wav'),
        InfoPlayerPalavra(
            legenda: 'Fazer as atividades',
            caminhoAudio: '/palavras/limite03.wav'),
        InfoPlayerPalavra(
            legenda: 'Respeite os colegas!',
            caminhoAudio: '/palavras/limite04.wav'),
        InfoPlayerPalavra(
            legenda: 'Respire fundo!', caminhoAudio: '/palavras/limite05.wav'),
        InfoPlayerPalavra(
            legenda: 'Se acalme!', caminhoAudio: '/palavras/limite06.wav'),
        InfoPlayerPalavra(
            legenda: 'Não pode!', caminhoAudio: '/palavras/limite07.wav'),
        InfoPlayerPalavra(
            legenda: 'Espere um pouquinho!',
            caminhoAudio: '/palavras/limite08.wav'),
        InfoPlayerPalavra(
            legenda: 'É importante ouvir!',
            caminhoAudio: '/palavras/limite09.wav'),
        InfoPlayerPalavra(
            legenda: 'Vamos juntos com cuidado!',
            caminhoAudio: '/palavras/limite10.wav'),
        InfoPlayerPalavra(
            legenda: 'Pare!', caminhoAudio: '/palavras/limite11.wav'),
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
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Palavras do Fefo',
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
            // ====================================================================
            //                 <-- AQUI ESTÁ A CORREÇÃO DE LAYOUT -->
            // Adicionado Padding para criar um espaço no final da lista,
            // evitando que o conteúdo fique atrás do botão "Voltar".
            // ====================================================================
            child: Padding(
              padding: const EdgeInsets.only(bottom: 90.0),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: _secoes.length,
                itemBuilder: (context, index) {
                  final secao = _secoes[index];
                  final icone = _iconesSecoes[secao.titulo] ??
                      Icons.record_voice_over; // Ícone padrão
                  return _CardPalavraExpansivel(secao: secao, icone: icone);
                },
              ),
            ),
          ),
          // O antigo botão "Voltar" foi REMOVIDO daqui.
        ],
      ),
    );
  }
}

/// Widget reutilizável para o Card expansível de cada seção de palavras.
class _CardPalavraExpansivel extends StatelessWidget {
  final SecaoPalavras secao;
  final IconData icone;

  const _CardPalavraExpansivel({required this.secao, required this.icone});

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
