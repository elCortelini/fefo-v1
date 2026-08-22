import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/controle_deslizante.dart';
import '../widgets/pagina_base.dart';

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
                  fontSize: 55,
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
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.45,
              ),
              itemCount: _padroes.length,
              itemBuilder: (context, index) {
                final padrao = _padroes[index];
                return ElevatedButton(
                  onPressed: manager.isConnected
                      ? () => manager.setLedPattern(padrao.numero)
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: padrao.cor,
                    foregroundColor: Colors.black87,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      padrao.nome,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'KGPen',
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
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
            BotaoPincelada(
              texto: 'Voltar',
              cor: const Color(0xFF318134),
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
