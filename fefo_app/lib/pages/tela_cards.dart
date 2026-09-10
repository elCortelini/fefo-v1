// lib/pages/tela_cards.dart

import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

final _cardsRandom = Random();
final _sonsAcerto = List<String>.generate(10, (i) => '/sys/a/sys${(i + 1).toString().padLeft(4, '0')}.wav');
final _sonsErro = List<String>.generate(10, (i) => '/sys/a/sys${(i + 11).toString().padLeft(4, '0')}.wav');
final _ultimosSonsCards = <String>[];

Future<void> _tocarRespostaCard(BuildContext context, bool acertou) async {
  final lista = acertou ? _sonsAcerto : _sonsErro;
  final disponiveis = lista.where((som) => !_ultimosSonsCards.contains(som)).toList();
  final candidatos = disponiveis.isEmpty ? lista : disponiveis;
  final som = candidatos[_cardsRandom.nextInt(candidatos.length)];
  _ultimosSonsCards.add(som);
  if (_ultimosSonsCards.length >= lista.length) _ultimosSonsCards.clear();
  try { await context.read<BluetoothManager>().playAudio(som); } catch (_) {}
}

// Estrutura para os dados de um player
class InfoPlayer {
  final String legenda;
  final String caminhoAudio;
  const InfoPlayer({required this.legenda, required this.caminhoAudio});
}

// Estrutura para agrupar uma seção de players
class SecaoCards {
  final String titulo;
  final List<InfoPlayer> players;
  const SecaoCards({required this.titulo, required this.players});
}

class TelaCards extends StatelessWidget {
  // Construtor const para melhor performance
  const TelaCards({super.key});

  // Mapa de ícones para cada seção
  final Map<String, IconData> _iconesSecoes = const {
    'ALFABETO': Icons.sort_by_alpha,
    'NÚMEROS': Icons.pin_outlined,
    'CORES': Icons.palette,
  };

  // Lista centralizada com todas as seções e seus dados
  final List<SecaoCards> _secoes = const [
    // --- SEÇÃO ALFABETO ---
    SecaoCards(
      titulo: 'ALFABETO',
      players: [
        InfoPlayer(
            legenda: 'Sons das Letras', caminhoAudio: '/simEnao/letra01.wav'),
        InfoPlayer(
            legenda: 'Formando Palavras', caminhoAudio: '/simEnao/letra02.wav'),
        InfoPlayer(
            legenda: 'Letra Artista', caminhoAudio: '/simEnao/letra03.wav'),
        InfoPlayer(
            legenda: 'Caça às Vogais', caminhoAudio: '/simEnao/letra04.wav'),
        InfoPlayer(
            legenda: 'Caça-Letrinhas com o Fefo',
            caminhoAudio: '/simEnao/letra05.wav'),
        InfoPlayer(
            legenda: 'Jogo do STOP das Letras',
            caminhoAudio: '/simEnao/letra06.wav'),
        InfoPlayer(
            legenda: 'Rimas Divertidas', caminhoAudio: '/simEnao/letra07.wav'),
        InfoPlayer(
            legenda: 'Explorador de Sons',
            caminhoAudio: '/simEnao/letra08.wav'),
        InfoPlayer(
            legenda: 'Palavras Escondidas',
            caminhoAudio: '/simEnao/letra09.wav'),
        InfoPlayer(
            legenda: 'Diga a Letra em Voz Alta',
            caminhoAudio: '/simEnao/letra10.wav'),
      ],
    ),
    // --- SEÇÃO NÚMEROS ---
    SecaoCards(
      titulo: 'NÚMEROS',
      players: [
        InfoPlayer(
            legenda: 'Contando com o Fefo', caminhoAudio: '/simEnao/num01.wav'),
        InfoPlayer(
            legenda: 'Encontre o Número', caminhoAudio: '/simEnao/num02.wav'),
        InfoPlayer(
            legenda: 'Ordem dos Números', caminhoAudio: '/simEnao/num03.wav'),
        InfoPlayer(
            legenda: 'Antes e Depois', caminhoAudio: '/simEnao/num04.wav'),
        InfoPlayer(
            legenda: 'Fazendo Continhas', caminhoAudio: '/simEnao/num05.wav'),
        InfoPlayer(
            legenda: 'Hora de Subtrair', caminhoAudio: '/simEnao/num06.wav'),
        InfoPlayer(
            legenda: 'Desenho com Números', caminhoAudio: '/simEnao/num07.wav'),
        InfoPlayer(
            legenda: 'Dobro e Metade', caminhoAudio: '/simEnao/num08.wav'),
        InfoPlayer(
            legenda: 'Brincando de Multiplicar',
            caminhoAudio: '/simEnao/num09.wav'),
      ],
    ),
    // --- SEÇÃO CORES ---
    SecaoCards(
      titulo: 'CORES',
      players: [
        InfoPlayer(
            legenda: 'Minha Cor Favorita', caminhoAudio: '/simEnao/cor01.wav'),
        InfoPlayer(
            legenda: 'Ordem do Arco-Íris', caminhoAudio: '/simEnao/cor02.wav'),
        InfoPlayer(
            legenda: 'Desenho Colorido', caminhoAudio: '/simEnao/cor03.wav'),
        InfoPlayer(
            legenda: 'Nome e Figura do card',
            caminhoAudio: '/simEnao/cor04.wav'),
        InfoPlayer(
            legenda: 'Caça-Cor na Sala', caminhoAudio: '/simEnao/cor05.wav'),
        InfoPlayer(
            legenda: 'Fale e Relacione a Cor',
            caminhoAudio: '/simEnao/cor06.wav'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          const SizedBox(height: 30),
          // TÍTULO DA PÁGINA
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'CARDs Interativos',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 52,
                  height: 1.1,
                  color: Theme.of(context).colorScheme.secondary,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // LISTA DE CARDS EXPANSÍVEIS
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _secoes.length,
              itemBuilder: (context, index) {
                final secao = _secoes[index];
                final icone = _iconesSecoes[secao.titulo] ?? Icons.category;
                return _CardSecaoExpansivel(secao: secao, icone: icone);
              },
            ),
          ),

          // BOTÕES DE AÇÃO FIXOS NA PARTE INFERIOR
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
            child: Row(
              children: [
                Expanded(
                  child: _BotaoAcaoVerde(
                    texto: 'Acertou',
                    aoPressionar: () => _tocarRespostaCard(context, true),
                  ),
                ),
                const SizedBox(width: 15),
                Expanded(
                  child: _BotaoAcaoLaranja(
                    texto: 'Errou',
                    aoPressionar: () => _tocarRespostaCard(context, false),
                  ),
                ),
              ],
            ),
          ),

          // BOTÃO VOLTAR
          Padding(
            padding: const EdgeInsets.only(bottom: 15.0, top: 5.0),
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

/// Widget reutilizável para o Card expansível de cada seção.
class _CardSecaoExpansivel extends StatelessWidget {
  final SecaoCards secao;
  final IconData icone;

  const _CardSecaoExpansivel({required this.secao, required this.icone});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 6),
      color: scheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 7),
        childrenPadding: EdgeInsets.zero,
        title: Text(
          secao.titulo,
          style: TextStyle(
            fontFamily: 'KGPen',
            fontSize: 28,
            color: scheme.primary,
          ),
        ),
        trailing: Icon(Icons.expand_more_rounded, color: scheme.primary),
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
                    larguraIcone: 0,
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

// Widgets locais para os botões de ação (Acertou/Errou)
class _BotaoAcaoVerde extends StatelessWidget {
  final String texto;
  final VoidCallback aoPressionar;

  const _BotaoAcaoVerde({required this.texto, required this.aoPressionar});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: aoPressionar,
      style: ElevatedButton.styleFrom(
        backgroundColor: Theme.of(context).colorScheme.primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        minimumSize: const Size(0, 60),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          texto,
          style: const TextStyle(
            fontFamily: 'Billotilde',
            fontSize: 32,
            color: Colors.white,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class _BotaoAcaoLaranja extends StatelessWidget {
  final String texto;
  final VoidCallback aoPressionar;

  const _BotaoAcaoLaranja({required this.texto, required this.aoPressionar});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: aoPressionar,
      style: ElevatedButton.styleFrom(
        backgroundColor: Theme.of(context).colorScheme.tertiary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        minimumSize: const Size(0, 60),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          texto,
          style: const TextStyle(
            fontFamily: 'Billotilde',
            fontSize: 32,
            color: Colors.white,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
