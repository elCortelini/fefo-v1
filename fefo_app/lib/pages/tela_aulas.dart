// lib/pages/tela_aulas.dart

import 'package:flutter/material.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';

class InfoAula {
  final String legenda;
  final String caminhoAudio;
  const InfoAula({required this.legenda, required this.caminhoAudio});
}

class SecaoAulas {
  final String titulo;
  final List<InfoAula> aulas;
  const SecaoAulas({required this.titulo, required this.aulas});
}

class TelaAulas extends StatelessWidget {
  const TelaAulas({super.key});

  final Map<String, IconData> _iconesSecoes = const {
    'AULAS DE PORTUGUÊS': Icons.menu_book,
    'AULAS DE MATEMÁTICA': Icons.calculate,
    'AULAS DE CIÊNCIAS': Icons.science,
  };

  final List<SecaoAulas> _secoes = const [
    SecaoAulas(
      titulo: 'AULAS DE PORTUGUÊS',
      aulas: [
        InfoAula(legenda: 'As Vogais', caminhoAudio: '/aulas/portugues01.wav'),
        InfoAula(
            legenda: 'Formando Palavras',
            caminhoAudio: '/aulas/portugues02.wav'),
        InfoAula(
            legenda: 'Leitura Divertida',
            caminhoAudio: '/aulas/portugues03.wav'),
      ],
    ),
    SecaoAulas(
      titulo: 'AULAS DE MATEMÁTICA',
      aulas: [
        InfoAula(
            legenda: 'Números de 1 a 10',
            caminhoAudio: '/aulas/matematica01.wav'),
        InfoAula(
            legenda: 'Somando com o Fefo',
            caminhoAudio: '/aulas/matematica02.wav'),
        InfoAula(
            legenda: 'Formas Geométricas',
            caminhoAudio: '/aulas/matematica03.wav'),
      ],
    ),
    SecaoAulas(
      titulo: 'AULAS DE CIÊNCIAS',
      aulas: [
        InfoAula(
            legenda: 'O Ciclo da Água', caminhoAudio: '/aulas/ciencias01.wav'),
        InfoAula(
            legenda: 'Plantas e Flores', caminhoAudio: '/aulas/ciencias02.wav'),
        InfoAula(
            legenda: 'Corpo Humano', caminhoAudio: '/aulas/ciencias03.wav'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Column(
        children: [
          const SizedBox(height: 25),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Aulas do Fefo',
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
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 90.0),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: _secoes.length,
                itemBuilder: (context, index) {
                  final secao = _secoes[index];
                  final icone = _iconesSecoes[secao.titulo] ?? Icons.school;
                  return _CardAulaExpansivel(secao: secao, icone: icone);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CardAulaExpansivel extends StatelessWidget {
  final SecaoAulas secao;
  final IconData icone;

  const _CardAulaExpansivel({required this.secao, required this.icone});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        leading: Icon(icone, size: 32, color: const Color(0xFFDC4900)),
        title: Text(
          secao.titulo,
          style: const TextStyle(
              fontFamily: 'KGPen', fontSize: 26, fontWeight: FontWeight.bold),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: secao.aulas.map((aula) {
                return Padding(
                  padding: const EdgeInsets.only(top: 12.0),
                  child: BotaoPlayer(
                    legenda: aula.legenda,
                    caminhoArquivoPlay: aula.caminhoAudio,
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
