// lib/pages/tela_teste_leds_fefo.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/botao_verde.dart';
import '../widgets/pagina_base.dart';

class TelaTesteLedsFefo extends StatelessWidget {
  const TelaTesteLedsFefo({super.key});

  @override
  Widget build(BuildContext context) {
    const corLaranja = Color(0xFFDC4900);
    const corVerde = Color(0xFF318134);

    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Consumer<BluetoothManager>(
        builder: (context, bluetoothManager, child) {
          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                children: [
                  const SizedBox(height: 25),
                  const Text(
                    'Teste de LEDs',
                    style: TextStyle(
                      fontFamily: 'Billotilde',
                      fontSize: 55,
                      height: 1.0,
                      color: corVerde,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    bluetoothManager.statusMensagem,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontFamily: 'KGPen',
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 22),
                  const _Subtitulo('Brilho'),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 10,
                    runSpacing: 10,
                    children: [0, 25, 50, 75, 100].map((valor) {
                      return ElevatedButton(
                        onPressed: () => bluetoothManager.setBrightness(valor),
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              valor == 0 ? Colors.red.shade700 : corVerde,
                          foregroundColor: Colors.white,
                        ),
                        child: Text(
                          valor == 0 ? 'OFF' : '$valor%',
                          style: const TextStyle(fontFamily: 'KGPen'),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  const _Subtitulo('Efeitos LED'),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 2.2,
                    ),
                    itemCount: 10,
                    itemBuilder: (context, index) {
                      final numero = index + 1;
                      const nomes = ['Confete neon', 'Onda tropical', 'Foguete', 'Pulsos de festa', 'Fogo divertido', 'Ping-pong', 'Arco-íris', 'Estrelas', 'Balada pastel', 'Chuva colorida'];
                      return BotaoPincelada(
                        texto: nomes[index],
                        cor: corLaranja,
                        fontSize: 35,
                        larguraPercentual: 0.42,
                        aoPressionar: () =>
                            bluetoothManager.setLedPattern(numero),
                      );
                    },
                  ),
                  const SizedBox(height: 25),
                  BotaoVerde(
                    texto: 'Status',
                    larguraPercentual: 0.45,
                    aoPressionar: () =>
                        bluetoothManager.enviarComando('STATUS'),
                  ),
                  const SizedBox(height: 35),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _Subtitulo extends StatelessWidget {
  final String texto;

  const _Subtitulo(this.texto);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        texto,
        style: const TextStyle(
          fontFamily: 'KGPen',
          fontSize: 22,
          fontWeight: FontWeight.bold,
          color: Color(0xFF318134),
        ),
      ),
    );
  }
}
