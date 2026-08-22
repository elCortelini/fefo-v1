// lib/pages/tela_seguro.dart

import 'package:flutter/material.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

// Estrutura para organizar os dados de cada dica
class InfoSeguranca {
  final String caminhoAudio;
  final String legenda;

  const InfoSeguranca({required this.caminhoAudio, required this.legenda});
}

class TelaSeguro extends StatelessWidget {
  TelaSeguro({super.key});

  // Lista centralizada com todas as dicas de segurança
  final List<InfoSeguranca> _listaDeDicas = const [
    InfoSeguranca(caminhoAudio: '/seg/seg01.wav', legenda: 'Usar cracha'),
    InfoSeguranca(caminhoAudio: '/seg/seg02.wav', legenda: 'Rotina Visual'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg03.wav', legenda: 'Identificar Locais'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg04.wav', legenda: 'Adulto de Confiança'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg05.wav', legenda: 'Regras de Segurança'),
    InfoSeguranca(caminhoAudio: '/seg/seg06.wav', legenda: 'Conhecer a Escola'),
    InfoSeguranca(caminhoAudio: '/seg/seg07.wav', legenda: 'Local Seguro'),
    InfoSeguranca(caminhoAudio: '/seg/seg08.wav', legenda: 'Pedir ajuda'),
    InfoSeguranca(caminhoAudio: '/seg/seg09.wav', legenda: 'Objetos Perigosos'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg10.wav', legenda: 'Escutar com atenção'),
    InfoSeguranca(caminhoAudio: '/seg/seg11.wav', legenda: 'Janelas e Portas'),
    InfoSeguranca(caminhoAudio: '/seg/seg12.wav', legenda: 'Perto dos Amigos'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg13.wav', legenda: 'Situações de Emergencia'),
    InfoSeguranca(caminhoAudio: '/seg/seg14.wav', legenda: 'Pessoas estranhas'),
    InfoSeguranca(caminhoAudio: '/seg/seg15.wav', legenda: 'Escute mais'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg16.wav', legenda: 'Fuga de Situações Difíceis'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg17.wav', legenda: 'Atenção ao Trânsito'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg18.wav', legenda: 'Cards de segurança'),
    InfoSeguranca(
        caminhoAudio: '/seg/seg19.wav', legenda: 'Incentivo a criança'),
  ];

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          // TÍTULO COM ÁREA VERTICAL REDUZIDA
          const SizedBox(height: 15),
          Text(
            'Dicas de Segurança',
            style: TextStyle(
              fontFamily: 'Billotilde',
              fontSize: 50,
              height: 1.0,
              color: Theme.of(context).colorScheme.secondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 15),

          // Lista de botões rolável
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _listaDeDicas.length,
              itemBuilder: (context, index) {
                final dica = _listaDeDicas[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 15.0),
                  child: BotaoPlayer(
                    legenda: dica.legenda,
                    caminhoArquivoPlay: dica.caminhoAudio,
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
