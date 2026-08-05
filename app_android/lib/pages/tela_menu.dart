import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import 'tela_audios_fefo.dart';
import 'tela_catalogo_online.dart';
import 'tela_faces_fefo.dart';
import 'tela_luzes.dart';
import 'tela_sobre.dart';
import 'tela_teste_vibracao_panico_fefo.dart';

class TelaMenu extends StatefulWidget {
  const TelaMenu({super.key});
  @override
  State<TelaMenu> createState() => _TelaMenuState();
}

class _TelaMenuState extends State<TelaMenu> {
  void _abrir(Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));

  @override
  Widget build(BuildContext context) {
    const laranja = Color(0xFFDC4900);
    const verde = Color(0xFF318134);
    const vermelho = Color(0xD5FF0101);
    return PaginaBase(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            const SizedBox(height: 20),
            BotaoPincelada(
              texto: 'PÂNICO',
              cor: vermelho,
              fontSize: 65,
              corBorda: Colors.white,
              aoPressionar: () => context
                  .read<BluetoothManager>()
                  .enviarComando('PANIC TRIGGER'),
            ),
            const SizedBox(height: 14),
            BotaoPincelada(
              texto: 'Jukebox do Fefo',
              cor: laranja,
              aoPressionar: () => _abrir(
                const TelaAudiosFefo(grupoInicial: 'Jukebox do Fefo'),
              ),
            ),
            const SizedBox(height: 4),
            Consumer<BluetoothManager>(
              builder: (context, manager, _) {
                final grupos = manager.audioGroups.keys
                    .where((grupo) => grupo != 'Jukebox do Fefo')
                    .toList()
                  ..sort();
                return Column(
                  children: grupos
                      .map((grupo) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: BotaoPincelada(
                              texto: grupo,
                              cor: laranja,
                              aoPressionar: () => _abrir(
                                TelaAudiosFefo(grupoInicial: grupo),
                              ),
                            ),
                          ))
                      .toList(),
                );
              },
            ),
            const SizedBox(height: 4),
            BotaoPincelada(
              texto: 'Catálogo Online',
              cor: laranja,
              aoPressionar: () => _abrir(const TelaCatalogoOnline()),
            ),
            const SizedBox(height: 4),
            BotaoPincelada(
              texto: 'Faces do Fefo',
              cor: laranja,
              aoPressionar: () => _abrir(const TelaFacesFefo()),
            ),
            const SizedBox(height: 4),
            BotaoPincelada(
              texto: 'Luzes terapêuticas',
              cor: laranja,
              aoPressionar: () => _abrir(const TelaLuzes()),
            ),
            const SizedBox(height: 4),
            BotaoPincelada(
              texto: 'Vibrações',
              cor: laranja,
              aoPressionar: () => _abrir(const TelaTesteVibracaoPanicoFefo()),
            ),
            const SizedBox(height: 4),
            BotaoPincelada(
              texto: 'Quem é o Fefo?',
              cor: laranja,
              aoPressionar: () => _abrir(TelaSobre()),
            ),
            const SizedBox(height: 30),
            BotaoPincelada(
              texto: 'Voltar',
              cor: verde,
              larguraPercentual: 0.72,
              aoPressionar: () => Navigator.pop(context),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
