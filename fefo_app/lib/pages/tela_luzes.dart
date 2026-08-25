import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/controle_deslizante.dart';
import '../widgets/pagina_base.dart';
import '../design_system/fefo_components.dart';

class _PadraoLed {
  final String nome;
  final int numero;
  final Color cor;
  const _PadraoLed(this.nome, this.numero, this.cor);
}

class TelaLuzes extends StatefulWidget {
  const TelaLuzes({super.key});

  @override
  State<TelaLuzes> createState() => _TelaLuzesState();
}

class _TelaLuzesState extends State<TelaLuzes> {
  int _brilho = 50;
  static const _padroes = [
    _PadraoLed('Confete neon', 1, Color(0xFFE91E63)),
    _PadraoLed('Onda tropical', 2, Color(0xFF19BFA7)),
    _PadraoLed('Foguete', 3, Color(0xFF3287E8)),
    _PadraoLed('Pulsos de festa', 4, Color(0xFFFF7A00)),
    _PadraoLed('Fogo divertido', 5, Color(0xFFE53935)),
    _PadraoLed('Ping-pong', 6, Color(0xFF7E57C2)),
    _PadraoLed('Arco-íris', 7, Color(0xFF20C7B5)),
    _PadraoLed('Estrelas', 8, Color(0xFF455A64)),
    _PadraoLed('Balada pastel', 9, Color(0xFFEC407A)),
    _PadraoLed('Chuva colorida', 10, Color(0xFF26A69A)),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && context.read<BluetoothManager>().isConnected) {
        context.read<BluetoothManager>().setBrightness(50);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final manager = context.watch<BluetoothManager>();
    return PaginaBase(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            const SizedBox(height: 25),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Luzes FEFO',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 52,
                  color: Theme.of(context).colorScheme.secondary,
                ),
              ),
            ),
            ControleDeslizante(
              titulo: 'Brilho',
              valor: _brilho,
              habilitado: manager.isConnected,
              aoAlterar: (valor) {
                setState(() => _brilho = valor);
                manager.setBrightness(valor);
              },
            ),
            const SizedBox(height: 12),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _padroes.length,
              itemBuilder: (context, index) {
                final padrao = _padroes[index];
                return FefoContentCard(
                  title: padrao.nome,
                  subtitle: 'Efeito ${padrao.numero} • cor correspondente',
                  icon: Icons.auto_awesome_rounded,
                  selected: manager.ledPatternSelecionado == padrao.numero,
                  leading: _LedPreview(padrao: padrao),
                  actionIcon: Icons.play_arrow_rounded,
                  onTap: manager.isConnected
                      ? () => manager.setLedPattern(padrao.numero)
                      : null,
                  onAction: manager.isConnected
                      ? () => manager.setLedPattern(padrao.numero)
                      : null,
                );
              },
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: manager.isConnected ? manager.desligarLeds : null,
              icon: const Icon(Icons.lightbulb_outline_rounded),
              label: const Text('Desligar LEDs',
                  style: TextStyle(fontFamily: 'KGPen', fontSize: 18)),
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black87,
                  foregroundColor: Colors.white),
            ),
            const SizedBox(height: 35),
          ],
        ),
      ),
    );
  }
}

class _LedPreview extends StatelessWidget {
  final _PadraoLed padrao;

  const _LedPreview({required this.padrao});

  @override
  Widget build(BuildContext context) {
    final rainbow = padrao.numero == 7;
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: rainbow
            ? const SweepGradient(colors: [
                Colors.red,
                Colors.yellow,
                Colors.green,
                Colors.cyan,
                Colors.blue,
                Colors.purple,
                Colors.red,
              ])
            : RadialGradient(colors: [padrao.cor, padrao.cor.withValues(alpha: .25)]),
        boxShadow: [
          BoxShadow(color: padrao.cor.withValues(alpha: .45), blurRadius: 10),
        ],
      ),
      child: const Icon(Icons.light_mode_rounded, color: Colors.white, size: 27),
    );
  }
}
