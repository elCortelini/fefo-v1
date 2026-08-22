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

  @override
  Widget build(BuildContext context) {
    final manager = context.read<BluetoothManager>();
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
                return FefoContentCard(
                  title: '${index + 1}. ${_nomes[index]}',
                  subtitle: 'Vibração do FEFO • 7 segundos',
                  icon: Icons.vibration_rounded,
                  actionIcon: Icons.play_arrow_rounded,
                  onTap: manager.isConnected
                      ? () => manager.vibrar(index + 1)
                      : null,
                  onAction: manager.isConnected
                      ? () => manager.vibrar(index + 1)
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
