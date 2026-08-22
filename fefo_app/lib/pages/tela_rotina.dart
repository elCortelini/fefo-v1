// lib/pages/tela_rotina.dart

import 'package:flutter/material.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

// Estrutura para organizar os dados de cada item da rotina
class InfoRotina {
  final String caminhoAudio;
  final String legenda;

  const InfoRotina({required this.caminhoAudio, required this.legenda});
}

class TelaRotina extends StatelessWidget {
  TelaRotina({super.key});

  // Lista centralizada com todos os itens da rotina
  final List<InfoRotina> _listaDeRotina = const [
    InfoRotina(
        caminhoAudio: '/rotina/rotina01.wav',
        legenda: 'Verificando sua mochila'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina02.wav', legenda: 'Cumprimentar amigos'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina03.wav', legenda: 'Prestar atenção'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina04.wav', legenda: 'Copiar o conteúdo'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina05.wav', legenda: 'Aproveitar o Recreio'),
    InfoRotina(caminhoAudio: '/rotina/rotina06.wav', legenda: 'Hora do Lanche'),
    InfoRotina(caminhoAudio: '/rotina/rotina07.wav', legenda: 'Hora do conto'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina08.wav', legenda: 'Sentar corretamente'),
    InfoRotina(caminhoAudio: '/rotina/rotina09.wav', legenda: 'Se comportar'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina10.wav', legenda: 'Não Atrapalhar a Aula'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina11.wav', legenda: 'Pedir para Levantar'),
    InfoRotina(caminhoAudio: '/rotina/rotina12.wav', legenda: 'Falar baixinho'),
    InfoRotina(caminhoAudio: '/rotina/rotina13.wav', legenda: 'Não Provocar'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina14.wav', legenda: 'Respeitar o Material'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina16.wav',
        legenda: 'Cuidar do Seu Material Escolar'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina17.wav', legenda: 'Organize sua mesa'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina18.wav', legenda: 'Esperar sua vez'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina19.wav',
        legenda: 'Respeitar a Professora'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina20.wav', legenda: 'Respeitar os Colegas'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina21.wav', legenda: 'Falar com respeito'),
    InfoRotina(caminhoAudio: '/rotina/rotina22.wav', legenda: 'Pedir Ajuda'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina23.wav', legenda: 'Focar nas Atividades'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina24.wav',
        legenda: 'Colaborar com os Colegas'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina25.wav', legenda: 'Não Usar Palavrões'),
    InfoRotina(
        caminhoAudio: '/rotina/rotina26.wav', legenda: 'Manter a Limpeza'),
    InfoRotina(caminhoAudio: '/rotina/rotina27.wav', legenda: 'Manter a Calma'),
  ];

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      child: Column(
        children: [
          // TÍTULO COM ÁREA VERTICAL REDUZIDA
          const SizedBox(height: 15),
          Text(
            'Rotina Escolar',
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
              itemCount: _listaDeRotina.length,
              itemBuilder: (context, index) {
                final item = _listaDeRotina[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 15.0),
                  child: BotaoPlayer(
                    legenda: item.legenda,
                    caminhoArquivoPlay: item.caminhoAudio,
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
