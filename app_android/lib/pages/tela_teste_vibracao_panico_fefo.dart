import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';

class TelaTesteVibracaoPanicoFefo extends StatelessWidget {
  const TelaTesteVibracaoPanicoFefo({super.key});

  @override
  Widget build(BuildContext context) {
    const laranja = Color(0xFFDC4900);
    const verde = Color(0xFF318134);
    final manager = context.read<BluetoothManager>();
    const nomes = ['Leve', 'Curta', 'Média', 'Longa', 'Forte'];

    return PaginaBase(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            const SizedBox(height: 30),
            for (var index = 0; index < nomes.length; index++) ...[
              BotaoPincelada(
                texto: nomes[index],
                cor: laranja,
                fontSize: 40,
                aoPressionar: () => manager.vibrar(index + 1),
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 25),
            BotaoPincelada(
              texto: 'Voltar',
              cor: verde,
              larguraPercentual: 0.72,
              aoPressionar: () => Navigator.pop(context),
            ),
            const SizedBox(height: 35),
          ],
        ),
      ),
    );
  }
}
