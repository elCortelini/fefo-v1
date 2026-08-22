import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_pincelada.dart';

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
          Text('Todos os padrões são intensos e duram 7 segundos.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 21,
                  color: Theme.of(context).colorScheme.secondary)),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              itemExtent: 92,
              itemCount: _nomes.length,
              itemBuilder: (context, index) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: BotaoPincelada(
                  texto: '${index + 1}. ${_nomes[index]}',
                  icone: Icons.vibration_rounded,
                  cor: Theme.of(context).colorScheme.primary,
                  larguraPercentual: 0.92,
                  fontSize: 25,
                  aoPressionar: manager.isConnected
                      ? () => manager.vibrar(index + 1)
                      : () {},
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
