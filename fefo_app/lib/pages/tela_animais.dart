// lib/pages/tela_animais.dart

import 'package:flutter/material.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

// Estrutura para um botão de ação (ex: "Que animal é esse?")
class PlayerAcao {
  final String caminhoAudio;
  final String legenda;
  const PlayerAcao({required this.caminhoAudio, required this.legenda});
}

// Estrutura completa para cada animal
class BlocoAnimal {
  final String somAnimal; // Caminho do áudio principal (som do animal)
  final String nomeAnimal; // Nome do animal para exibir
  final List<PlayerAcao> acoes; // A lista de 3 botões de ação
  const BlocoAnimal({
    required this.somAnimal,
    required this.nomeAnimal,
    required this.acoes,
  });
}

class TelaAnimais extends StatelessWidget {
  const TelaAnimais({super.key});

  // Mapa de ícones para cada animal, para deixar a UI mais divertida
  final Map<String, String> _iconesAnimais = const {
    'Cachorro': '🐶',
    'Gato': '🐱',
    'Galinha': '🐔',
    'Coelho': '🐰',
    'Rato': '🐭',
    'Vaca': '🐮',
    'Cavalo': '🐴',
    'Porco': '🐷',
    'Cabra': '🐐',
    'Ovelha': '🐑',
    'Leão': '🦁',
    'Macaco': '🐵',
    'Urso': '🐻',
    'Jacaré': '🐊',
    'Lobo': '🐺',
    'Girafa': '🦒',
    'Tamandua': '🐾', // Emoji genérico
    'Coruja': '🦉',
    'Onça': '🐆',
    'Capivara': '🐾', // Emoji genérico
  };

  // Lista completa com todos os 20 animais
  final List<BlocoAnimal> _listaDeBlocos = const [
    BlocoAnimal(
      nomeAnimal: 'Cachorro',
      somAnimal: '/animais/animal01.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal02.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal03.wav', legenda: 'Se expresse'),
        PlayerAcao(
            caminhoAudio: '/animais/animal04.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Gato',
      somAnimal: '/animais/animal05.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal06.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal07.wav', legenda: 'imite um gato'),
        PlayerAcao(
            caminhoAudio: '/animais/animal08.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Galinha',
      somAnimal: '/animais/animal09.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal10.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal11.wav', legenda: 'Se expresse'),
        PlayerAcao(
            caminhoAudio: '/animais/animal12.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Coelho',
      somAnimal: '/animais/animal13.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal14.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal15.wav', legenda: 'imite um coelho'),
        PlayerAcao(
            caminhoAudio: '/animais/animal16.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Rato',
      somAnimal: '/animais/animal17.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal18.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal19.wav', legenda: 'Se expresse'),
        PlayerAcao(
            caminhoAudio: '/animais/animal20.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Vaca',
      somAnimal: '/animais/animal21.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal22.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal23.wav', legenda: 'imite uma vaca'),
        PlayerAcao(
            caminhoAudio: '/animais/animal24.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Cavalo',
      somAnimal: '/animais/animal25.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal26.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal27.wav', legenda: 'imite um cavalo'),
        PlayerAcao(
            caminhoAudio: '/animais/animal28.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Porco',
      somAnimal: '/animais/animal29.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal30.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(
            caminhoAudio: '/animais/animal31.wav',
            legenda: 'imite um porquinho'),
        PlayerAcao(
            caminhoAudio: '/animais/animal32.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Cabra',
      somAnimal: '/animais/animal33.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal34.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal35.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal36.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Ovelha',
      somAnimal: '/animais/animal37.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal38.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal39.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal40.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Leão',
      somAnimal: '/animais/animal41.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal42.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal43.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal44.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Macaco',
      somAnimal: '/animais/animal45.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal46.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal47.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal48.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Urso',
      somAnimal: '/animais/animal49.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal50.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal51.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal52.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Jacaré',
      somAnimal: '/animais/animal53.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal54.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal55.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal56.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Lobo',
      somAnimal: '/animais/animal57.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal58.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal59.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal60.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Girafa',
      somAnimal: '/animais/animal61.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal62.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal63.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal64.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Tamandua',
      somAnimal: '/animais/animal65.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal66.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal67.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal68.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Coruja',
      somAnimal: '/animais/animal69.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal70.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal71.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal72.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Onça',
      somAnimal: '/animais/animal73.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal74.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal75.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal76.wav', legenda: 'Fale sobre ele'),
      ],
    ),
    BlocoAnimal(
      nomeAnimal: 'Capivara',
      somAnimal: '/animais/animal77.wav',
      acoes: [
        PlayerAcao(
            caminhoAudio: '/animais/animal78.wav',
            legenda: 'Que animal é esse?'),
        PlayerAcao(caminhoAudio: '/animais/animal79.wav', legenda: 'Imite'),
        PlayerAcao(
            caminhoAudio: '/animais/animal80.wav', legenda: 'Fale sobre ele'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          const SizedBox(height: 25),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Conhecendo os Animais',
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
          const SizedBox(height: 20),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _listaDeBlocos.length,
              itemBuilder: (context, index) {
                final bloco = _listaDeBlocos[index];
                final icone = _iconesAnimais[bloco.nomeAnimal] ?? '🐾';
                return _CardAnimalExpansivel(bloco: bloco, icone: icone);
              },
            ),
          ),
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

/// Widget reutilizável para o Card expansível de cada animal.
class _CardAnimalExpansivel extends StatelessWidget {
  final BlocoAnimal bloco;
  final String icone;

  const _CardAnimalExpansivel({
    required this.bloco,
    required this.icone,
  });

  @override
  Widget build(BuildContext context) {
    // Lista unificada com todos os 4 botões para fácil gerenciamento
    final todosOsBotoes = [
      // 1. Botão principal com a legenda alterada
      PlayerAcao(
        caminhoAudio: bloco.somAnimal,
        // ================== ALTERAÇÃO PRINCIPAL AQUI ==================
        legenda: 'Curiosidade sobre',
        // ============================================================
      ),
      // 2. Os outros 3 botões de ação
      ...bloco.acoes,
    ];

    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        leading: Text(
          icone,
          style: const TextStyle(fontSize: 28),
        ),
        title: Text(
          bloco.nomeAnimal.toUpperCase(),
          style: const TextStyle(
            fontFamily: 'KGPen',
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              // Lógica simplificada para espaçamento uniforme
              children: todosOsBotoes.map((acao) {
                return Padding(
                  // Aplica um espaçamento superior em todos os botões
                  padding: const EdgeInsets.only(top: 12.0),
                  child: BotaoPlayer(
                    legenda: acao.legenda,
                    caminhoArquivoPlay: acao.caminhoAudio,
                    // Deixa o ícone do primeiro botão maior para destaque
                    larguraIcone:
                        acao.legenda.startsWith('Curiosidade') ? 40 : 35,
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
