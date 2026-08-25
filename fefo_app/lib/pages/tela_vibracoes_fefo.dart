import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../design_system/fefo_components.dart';

class TelaVibracoesFefo extends StatelessWidget {
  const TelaVibracoesFefo({super.key});

  static const _nomes = [
    'Metralhadora',
    'Batida dupla',
    'SOS intenso',
    'Onda forte',
    'Triplo impacto',
    'Sirene',
    'Marcha',
    'Crescendo',
    'Festa',
    'Pulso',
  ];

  static const _cores = [
    Color(0xFFE85D75),
    Color(0xFFF08A5D),
    Color(0xFFE6B566),
    Color(0xFF8BCB9A),
    Color(0xFF49A078),
    Color(0xFF3FA7D6),
    Color(0xFF5474C4),
    Color(0xFF8064A2),
    Color(0xFFB565A7),
    Color(0xFF4DB6AC),
  ];

  @override
  Widget build(BuildContext context) {
    final manager = context.watch<BluetoothManager>();
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Column(
        children: [
          const SizedBox(height: 18),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text('Vibrações do FEFO',
                style: TextStyle(
                    fontFamily: 'Billotilde',
                    fontSize: 52,
                    color: Theme.of(context).colorScheme.secondary)),
          ),
          const FefoPageSubtitle(
              text: 'Todos os padrões são intensos e duram 7 segundos.'),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              itemCount: _nomes.length,
              itemBuilder: (context, index) {
                final numero = index + 1;
                final cor = _cores[index];
                return FefoContentCard(
                  title: '${index + 1}. ${_nomes[index]}',
                  subtitle: 'Vibração do FEFO • 7 segundos',
                  icon: Icons.vibration_rounded,
                  selected: manager.vibracaoSelecionada == numero,
                  leading: Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: cor.withValues(alpha: .2),
                      border: Border.all(color: cor, width: 2),
                    ),
                    child: Icon(Icons.vibration_rounded, color: cor),
                  ),
                  actionIcon: Icons.play_arrow_rounded,
                  onTap: manager.isConnected
                      ? () => manager.vibrar(numero)
                      : null,
                  onAction: manager.isConnected
                      ? () => manager.vibrar(numero)
                      : null,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
