// lib/pages/tela_meu_corpo.dart

import 'package:flutter/material.dart';

import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart'; // Nosso widget de player
import '../widgets/botao_verde.dart'; // Para o botão de voltar

// Classe para organizar os dados de cada botão
class InfoAudio {
  final String legenda;
  final String caminhoAudio;

  const InfoAudio({required this.legenda, required this.caminhoAudio});
}

class TelaMeuCorpo extends StatelessWidget {
  // A lista de áudios e legendas permanece a mesma
  final List<InfoAudio> _audios = const [
    InfoAudio(legenda: 'MEU CORPO', caminhoAudio: '/corpo/corpo01.wav'),
    InfoAudio(legenda: 'HIGIENE', caminhoAudio: '/corpo/corpo02.wav'),
    InfoAudio(legenda: 'LAVAR AS MÃOS', caminhoAudio: '/corpo/corpo03.wav'),
    InfoAudio(legenda: 'Escovar os dentes', caminhoAudio: '/corpo/corpo04.wav'),
    InfoAudio(legenda: 'Cuidar da pele', caminhoAudio: '/corpo/corpo05.wav'),
    InfoAudio(legenda: 'Beber água', caminhoAudio: '/corpo/corpo06.wav'),
    InfoAudio(
        legenda: 'Alimentação Saudável', caminhoAudio: '/corpo/corpo07.wav'),
    InfoAudio(legenda: 'Ouvir o corpo', caminhoAudio: '/corpo/corpo08.wav'),
    InfoAudio(
        legenda: 'Exercícios físicos', caminhoAudio: '/corpo/corpo09.wav'),
    InfoAudio(legenda: 'Dormir', caminhoAudio: '/corpo/corpo10.wav'),
    InfoAudio(
        legenda: 'Importância das Rotinas', caminhoAudio: '/corpo/corpo11.wav'),
    InfoAudio(
        legenda: 'Importância das emoções', caminhoAudio: '/corpo/corpo12.wav'),
    InfoAudio(legenda: 'Respiração', caminhoAudio: '/corpo/corpo13.wav'),
    InfoAudio(
        legenda: 'Cuidar dos Cabelos', caminhoAudio: '/corpo/corpo14.wav'),
    InfoAudio(legenda: 'Limites Pessoais', caminhoAudio: '/corpo/corpo15.wav'),
    InfoAudio(
        legenda: 'Lidar com estresse', caminhoAudio: '/corpo/corpo16.wav'),
    InfoAudio(
        legenda: 'Importância de se vestir',
        caminhoAudio: '/corpo/corpo17.wav'),
    InfoAudio(legenda: 'Autoestima', caminhoAudio: '/corpo/corpo18.wav'),
    InfoAudio(legenda: 'Respeitar o corpo', caminhoAudio: '/corpo/corpo19.wav'),
    InfoAudio(
        legenda: 'Amizade e socialização', caminhoAudio: '/corpo/corpo20.wav'),
    InfoAudio(legenda: 'Espaço e limites', caminhoAudio: '/corpo/corpo21.wav'),
    InfoAudio(legenda: 'Uso da tecnologia', caminhoAudio: '/corpo/corpo22.wav'),
    InfoAudio(
        legenda: 'Resolução de Problemas', caminhoAudio: '/corpo/corpo23.wav'),
    InfoAudio(
        legenda: 'Cuidado com os animais', caminhoAudio: '/corpo/corpo24.wav'),
    InfoAudio(
        legenda: 'Respeito ao Meio ambiente',
        caminhoAudio: '/corpo/corpo25.wav'),
    InfoAudio(legenda: 'Ir no banheiro', caminhoAudio: '/corpo/corpo26.wav'),
  ];

  TelaMeuCorpo({super.key});

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          const SizedBox(height: 30),
          const Text(
            'Meu Corpo',
            style: TextStyle(
              fontFamily: 'Billotilde',
              fontSize: 60,
              height: 1.1,
              color: Color(0xFF318134),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 30),

          // ======================================================================
          // LAYOUT ALTERADO AQUI: De GridView para ListView
          // Isso cria uma lista vertical rolável, como na tela de desafios.
          // ======================================================================
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _audios.length, // O número de itens na lista
              itemBuilder: (context, index) {
                final audioInfo = _audios[index];
                // Adicionamos um Padding para dar espaço entre os botões
                return Padding(
                  padding: const EdgeInsets.only(bottom: 15.0),
                  child: BotaoPlayer(
                    legenda: audioInfo.legenda,
                    caminhoArquivoPlay: audioInfo.caminhoAudio,
                    larguraIcone: 40,
                  ),
                );
              },
            ),
          ),
          // ======================================================================

          // Botão de Voltar na parte inferior
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
