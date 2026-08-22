import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../design_system/fefo_components.dart';
import '../managers/bluetooth_manager.dart';
import '../theme/fefo_theme.dart';
import '../widgets/pagina_base.dart';
import 'tela_audios_fefo.dart';
import 'tela_cards.dart';
import 'tela_catalogo_online.dart';
import 'tela_classicas.dart';
import 'tela_configuracoes.dart';
import 'tela_conexao.dart';
import 'tela_faces_fefo.dart';
import 'tela_favoritos.dart';
import 'tela_luzes.dart';
import 'tela_sobre.dart';

class TelaMenu extends StatelessWidget {
  const TelaMenu({super.key});

  void _abrir(BuildContext context, Widget page) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  }

  bool _temAudio(BluetoothManager manager, String grupo) {
    final itens = manager.audioGroups[grupo];
    return itens != null && itens.isNotEmpty;
  }

  List<_MenuSection> _secoes(BuildContext context, BluetoothManager manager) {
    final audio = (String nome) => TelaAudiosFefo(grupoInicial: nome);
    final exploracao = <_MenuEntry>[
      _MenuEntry(
          'Aulas do Fefo', () => _abrir(context, audio('Aulas do Fefo'))),
      ...[
        'Desafios e Brincadeiras',
        'Meu corpo',
        'Contos de Fefo',
        'Palavras do Fefo',
        'Aventuras Seguras',
        'Minha Rotina',
        'Conhecendo os animais',
      ].where((grupo) => _temAudio(manager, grupo)).map(
            (grupo) => _MenuEntry(grupo, () => _abrir(context, audio(grupo))),
          ),
      _MenuEntry('CARDs Interativos', () => _abrir(context, const TelaCards()),
          icon: Icons.style_rounded),
    ];

    final estimulos = <_MenuEntry>[
      if (_temAudio(manager, 'Músicas Clássicas'))
        _MenuEntry(
            'Músicas Clássicas', () => _abrir(context, const TelaClassicas())),
      if (_temAudio(manager, 'Instrumentais e Natureza'))
        _MenuEntry('Instrumentais e Natureza',
            () => _abrir(context, audio('Instrumentais e Natureza'))),
      if (_temAudio(manager, 'Jukebox do Fefo'))
        _MenuEntry(
            'Jukebox do Fefo', () => _abrir(context, audio('Jukebox do Fefo'))),
    ];

    final terapias = <_MenuEntry>[
      _MenuEntry('Luzes Terapêuticas', () => _abrir(context, const TelaLuzes()),
          icon: Icons.light_mode_rounded),
      if (_temAudio(manager, 'Relaxamento'))
        _MenuEntry('Relaxamento', () => _abrir(context, audio('Relaxamento'))),
    ];

    return [
      _MenuSection('Exploração diária', exploracao,
          icon: Icons.explore_rounded),
      if (estimulos.isNotEmpty)
        _MenuSection('Estímulos sonoros', estimulos,
            icon: Icons.music_note_rounded),
      _MenuSection('Terapias guiadas', terapias, icon: Icons.spa_rounded),
      _MenuSection(
          'Sobre o FEFO',
          [
            _MenuEntry('Catálogo online',
                () => _abrir(context, const TelaCatalogoOnline()),
                icon: Icons.cloud_download_rounded),
            _MenuEntry(
                'Quem é o FEFO', () => _abrir(context, const TelaSobre()),
                icon: Icons.favorite_rounded),
            _MenuEntry('Rostinhos do FEFO',
                () => _abrir(context, const TelaFacesFefo()),
                icon: Icons.face_rounded),
            _MenuEntry('Configurações',
                () => _abrir(context, const TelaConfiguracoes()),
                icon: Icons.settings_rounded),
          ],
          icon: Icons.info_outline_rounded),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<FefoThemeController>().current;
    return PaginaBase(
      mostrarBotaoVoltar: true,
      indiceNavegacao: 2,
      child: Consumer<BluetoothManager>(
        builder: (context, manager, _) {
          if (manager.lendoCatalogo) {
            return const Center(child: CircularProgressIndicator());
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.only(top: 8, bottom: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const FefoPageHeader(
                  title: 'Menu do FEFO',
                  subtitle: 'Escolha uma atividade para começar.',
                ),
                if (!manager.isConnected) ...[
                  FefoStatusBadge(
                    label: 'FEFO desconectado · menu disponível',
                    icon: Icons.bluetooth_disabled_rounded,
                    color: theme.accent,
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => _abrir(context, const TelaConexao()),
                      icon: const Icon(Icons.bluetooth_searching_rounded),
                      label: const Text('Conectar'),
                    ),
                  ),
                ],
                SizedBox(
                  height: 76,
                  child: FilledButton.icon(
                    style:
                        FilledButton.styleFrom(backgroundColor: theme.accent),
                    onPressed: () => manager.enviarComando('PANIC TRIGGER'),
                    icon: const Icon(Icons.notifications_active_rounded),
                    label: const Text('PÂNICO'),
                  ),
                ),
                const SizedBox(height: 12),
                _MenuAction(
                    label: 'Ronronar',
                    icon: Icons.pets_rounded,
                    onPressed: manager.ronronar),
                _MenuAction(
                    label: 'Favoritos',
                    icon: Icons.star_rounded,
                    onPressed: () => _abrir(context, const TelaFavoritos())),
                const SizedBox(height: 8),
                ..._secoes(context, manager)
                    .map((section) => _MenuSectionView(section: section)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MenuSection {
  final String title;
  final List<_MenuEntry> entries;
  final IconData icon;

  const _MenuSection(this.title, this.entries, {required this.icon});
}

class _MenuEntry {
  final String label;
  final VoidCallback onPressed;
  final IconData icon;

  const _MenuEntry(this.label, this.onPressed,
      {this.icon = Icons.arrow_forward_rounded});
}

class _MenuSectionView extends StatelessWidget {
  final _MenuSection section;

  const _MenuSectionView({required this.section});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 20, bottom: 8),
          child: Row(
            children: [
              Icon(section.icon,
                  size: 20, color: Theme.of(context).colorScheme.secondary),
              const SizedBox(width: 8),
              Text(section.title,
                  style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
        ...section.entries.map(
          (entry) => _MenuAction(
              label: entry.label, icon: entry.icon, onPressed: entry.onPressed),
        ),
      ],
    );
  }
}

class _MenuAction extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _MenuAction(
      {required this.label, required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          onTap: onPressed,
          leading: Icon(icon),
          title: Text(label),
          trailing: const Icon(Icons.chevron_right_rounded),
        ),
      ),
    );
  }
}
