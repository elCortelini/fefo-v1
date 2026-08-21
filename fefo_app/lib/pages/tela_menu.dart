import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import 'tela_audios_fefo.dart';
import 'tela_cards.dart';
import 'tela_catalogo_online.dart';
import 'tela_configuracoes.dart';
import 'tela_classicas.dart';
import 'tela_conexao.dart';
import 'tela_luzes.dart';
import 'tela_sobre.dart';
import 'tela_faces_fefo.dart';
import 'tela_favoritos.dart';
import '../theme/fefo_theme.dart';

class TelaMenu extends StatefulWidget {
  const TelaMenu({super.key});

  @override
  State<TelaMenu> createState() => _TelaMenuState();
}

class _TelaMenuState extends State<TelaMenu> {
  void _abrir(Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));

  bool _temConteudoAudio(BluetoothManager manager, String nomeGrupo) {
    final list = manager.audioGroups[nomeGrupo];
    return list != null && list.isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>().current;
    final verde = theme.accentSecondary;
    const vermelho = Color(0xD5FF0101);

    return PaginaBase(
      child: Consumer<BluetoothManager>(
        builder: (context, manager, _) {
          if (manager.lendoCatalogo) {
            return Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: theme.accent),
                    SizedBox(height: 24),
                    Text(
                      'Lendo catálogo interno do FEFO...',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 22,
                          color: theme.text,
                          fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 10),
                    Text(
                      'Sincronizando áudios e conteúdos do seu PET.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 16,
                          color: theme.mutedText),
                    ),
                  ],
                ),
              ),
            );
          }

          // Exceções com presenças fixas solicitadas: Alarmes, CARDs Interativos, Aulas do Fefo
          final temDesafios =
              _temConteudoAudio(manager, 'Desafios e Brincadeiras');
          final temMeuCorpo = _temConteudoAudio(manager, 'Meu corpo');
          final temContos = _temConteudoAudio(manager, 'Contos de Fefo');
          final temPalavras = _temConteudoAudio(manager, 'Palavras do Fefo');
          final temSeguro = _temConteudoAudio(manager, 'Aventuras Seguras');
          final temRotina = _temConteudoAudio(manager, 'Minha Rotina');
          final temAnimais =
              _temConteudoAudio(manager, 'Conhecendo os animais');

          const temExploracao = true;

          final temClassicas = _temConteudoAudio(manager, 'Músicas Clássicas');
          final temInstrumentais =
              _temConteudoAudio(manager, 'Instrumentais e Natureza');
          final temJukebox = _temConteudoAudio(manager, 'Jukebox do Fefo');
          final temEstimulos = temClassicas || temInstrumentais || temJukebox;

          final temRelaxamento = _temConteudoAudio(manager, 'Relaxamento');
          const temLuzes = true;
          final temTerapias = temRelaxamento || temLuzes;

          const temSobre = true;

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                const SizedBox(height: 20),
                if (!manager.isConnected) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC4900).withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFDC4900)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.bluetooth_disabled_rounded,
                            color: Color(0xFFDC4900)),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'FEFO desconectado. O menu continua disponível.',
                            style: TextStyle(
                                fontFamily: 'KGPen',
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                        TextButton(
                          onPressed: () => _abrir(const TelaConexao()),
                          child: const Text('Conectar'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 15),
                ],
                // Botão Pânico bem no topo
                BotaoPincelada(
                  texto: 'PÂNICO',
                  cor: vermelho,
                  fontSize: 60,
                  corBorda: Colors.white,
                  aoPressionar: () => context
                      .read<BluetoothManager>()
                      .enviarComando('PANIC TRIGGER'),
                ),
                const SizedBox(height: 15),
                _BotaoMenu(texto: 'Ronronar', aoPressionar: manager.ronronar),
                _BotaoMenu(texto: 'Favoritos', aoPressionar: () => _abrir(const TelaFavoritos())),
                const SizedBox(height: 15),

                // SEÇÃO 1: Exploração diária
                if (temExploracao) ...[
                  const _TituloSecao(titulo: 'Exploração diária'),
                  const SizedBox(height: 8),
                  _BotaoMenu(
                    texto: 'Aulas do Fefo',
                    aoPressionar: () => _abrir(
                      const TelaAudiosFefo(grupoInicial: 'Aulas do Fefo'),
                    ),
                  ),
                  if (temDesafios)
                    _BotaoMenu(
                      texto: 'Desafios e Brincadeiras',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(
                            grupoInicial: 'Desafios e Brincadeiras'),
                      ),
                    ),
                  if (temMeuCorpo)
                    _BotaoMenu(
                      texto: 'Meu corpo',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(grupoInicial: 'Meu corpo'),
                      ),
                    ),
                  if (temContos)
                    _BotaoMenu(
                      texto: 'Contos de Fefo',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(grupoInicial: 'Contos de Fefo'),
                      ),
                    ),
                  if (temPalavras)
                    _BotaoMenu(
                      texto: 'Palavras do Fefo',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(grupoInicial: 'Palavras do Fefo'),
                      ),
                    ),
                  if (temSeguro)
                    _BotaoMenu(
                      texto: 'Aventuras Seguras',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(
                            grupoInicial: 'Aventuras Seguras'),
                      ),
                    ),
                  if (temRotina)
                    _BotaoMenu(
                      texto: 'Minha Rotina',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(grupoInicial: 'Minha Rotina'),
                      ),
                    ),
                  if (temAnimais)
                    _BotaoMenu(
                      texto: 'Conhecendo os animais',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(
                            grupoInicial: 'Conhecendo os animais'),
                      ),
                    ),
                  _BotaoMenu(
                    texto: 'CARDs Interativos',
                    aoPressionar: () => _abrir(const TelaCards()),
                  ),
                  const SizedBox(height: 15),
                ],

                // SEÇÃO 2: Estímulos Sonoros
                if (temEstimulos) ...[
                  const _TituloSecao(titulo: 'Estímulos Sonoros'),
                  const SizedBox(height: 8),
                  if (temClassicas)
                    _BotaoMenu(
                      texto: 'Músicas Clássicas',
                      aoPressionar: () => _abrir(const TelaClassicas()),
                    ),
                  if (temInstrumentais)
                    _BotaoMenu(
                      texto: 'Instrumentais e Natureza',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(
                            grupoInicial: 'Instrumentais e Natureza'),
                      ),
                    ),
                  if (temJukebox)
                    _BotaoMenu(
                      texto: 'Jukebox do Fefo',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(grupoInicial: 'Jukebox do Fefo'),
                      ),
                    ),
                  const SizedBox(height: 15),
                ],

                // SEÇÃO 3: Terapias guiadas
                if (temTerapias) ...[
                  const _TituloSecao(titulo: 'Terapias guiadas'),
                  const SizedBox(height: 8),
                  _BotaoMenu(
                    texto: 'Luzes Terapêuticas',
                    aoPressionar: () => _abrir(const TelaLuzes()),
                  ),
                  if (temRelaxamento)
                    _BotaoMenu(
                      texto: 'Relaxamento',
                      aoPressionar: () => _abrir(
                        const TelaAudiosFefo(grupoInicial: 'Relaxamento'),
                      ),
                    ),
                  const SizedBox(height: 15),
                ],

                // SEÇÃO 4: Sobre o Fefo
                if (temSobre) ...[
                  const _TituloSecao(titulo: 'Sobre o Fefo'),
                  const SizedBox(height: 8),
                  _BotaoMenu(
                    texto: 'Catálogo online',
                    aoPressionar: () => _abrir(const TelaCatalogoOnline()),
                  ),
                  _BotaoMenu(
                    texto: 'Quem é o Fefo',
                    aoPressionar: () => _abrir(const TelaSobre()),
                  ),
                  _BotaoMenu(
                    texto: 'Rostinhos do Fefo',
                    aoPressionar: () => _abrir(const TelaFacesFefo()),
                  ),
                  _BotaoMenu(
                    texto: 'Configurações',
                    aoPressionar: () => _abrir(const TelaConfiguracoes()),
                  ),
                  const SizedBox(height: 15),
                ],

                const SizedBox(height: 15),
                BotaoPincelada(
                  texto: 'Voltar',
                  cor: verde,
                  larguraPercentual: 0.72,
                  aoPressionar: () => Navigator.pop(context),
                ),
                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TituloSecao extends StatelessWidget {
  final String titulo;

  const _TituloSecao({required this.titulo});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 4),
      child: Text(
        titulo,
        style: const TextStyle(
          fontFamily: 'Billotilde',
          fontSize: 40,
          color: Color(0xFF318134),
          fontWeight: FontWeight.bold,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _BotaoMenu extends StatelessWidget {
  final String texto;
  final VoidCallback aoPressionar;

  const _BotaoMenu({required this.texto, required this.aoPressionar});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: BotaoPincelada(
        texto: texto,
        cor: const Color(0xFFDC4900),
        aoPressionar: aoPressionar,
      ),
    );
  }
}
