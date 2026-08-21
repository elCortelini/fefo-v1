import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';

class TelaVibracoesFefo extends StatelessWidget {
  const TelaVibracoesFefo({super.key});

  static const _nomes = [
    'Metralhadora', 'Batida dupla', 'SOS intenso', 'Onda forte',
    'Triplo impacto', 'Sirene', 'Marcha', 'Crescendo', 'Festa', 'Pulso',
  ];

  @override
  Widget build(BuildContext context) {
    final manager = context.read<BluetoothManager>();
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Column(
        children: [
          const SizedBox(height: 18),
          Text('Vibrações do FEFO', style: TextStyle(fontFamily: 'Billotilde', fontSize: 42, color: Theme.of(context).colorScheme.secondary)),
          const Text('Todos os padrões são intensos e duram 7 segundos.', style: TextStyle(fontFamily: 'KGPen', fontSize: 15)),
          const SizedBox(height: 12),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(8),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.65),
              itemCount: _nomes.length,
              itemBuilder: (context, index) => ElevatedButton.icon(
                icon: const Icon(Icons.vibration_rounded),
                label: Text('${index + 1}. ${_nomes[index]}', textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'KGPen')),
                style: ElevatedButton.styleFrom(backgroundColor: index.isEven ? const Color(0xFF318134) : const Color(0xFFDC4900), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                onPressed: manager.isConnected ? () => manager.vibrar(index + 1) : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
