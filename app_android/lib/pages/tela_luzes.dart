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
    _PadraoLed('Vermelho', 1, Colors.red),
    _PadraoLed('Verde', 2, Color(0xFF35B84A)),
    _PadraoLed('Azul', 3, Color(0xFF3287E8)),
    _PadraoLed('Pisca branco', 4, Colors.white),
    _PadraoLed('Ponto laranja', 5, Colors.orange),
    _PadraoLed('Roxo alternado', 6, Color(0xFF9C55D8)),
    _PadraoLed('Arco-íris', 7, Color(0xFF20C7B5)),
    _PadraoLed('Respiração azul', 8, Colors.lightBlueAccent),
    _PadraoLed('Polícia', 9, Color(0xFF6457E8)),
    _PadraoLed('Rastro laranja', 10, Colors.orangeAccent),
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
            const FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                'Luzes FEFO',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 55,
                  color: Color(0xFF318134),
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
