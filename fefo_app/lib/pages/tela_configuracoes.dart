import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_pincelada.dart';
import 'tela_faces_fefo.dart';

class TelaConfiguracoes extends StatefulWidget {
  const TelaConfiguracoes({super.key});

  @override
  State<TelaConfiguracoes> createState() => _TelaConfiguracoesState();
}

class _TelaConfiguracoesState extends State<TelaConfiguracoes> {
  bool _vibracaoAtiva = true;
  bool _facesAtivas = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final manager = context.read<BluetoothManager>();
      setState(() {
        _facesAtivas = manager.faceModeEnabled;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    const corVerde = Color(0xFF318134);
    const corLaranja = Color(0xFFDC4900);
    final manager = context.watch<BluetoothManager>();

    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 10),
            const Text(
              'Configurações',
              style: TextStyle(
                fontFamily: 'Billotilde',
                fontSize: 55,
                color: corVerde,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            const Text(
              'Ajustes de vibração e exibição do PET FEFO',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'KGPen',
                fontSize: 15,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 25),

            // Card Vibração
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 8,
                    offset: Offset(0, 3),
                  ),
                ],
                border: Border.all(color: corVerde.withValues(alpha: 0.3), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.vibration_rounded, color: corLaranja, size: 30),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Vibração do PET FEFO',
                          style: TextStyle(
                            fontFamily: 'KGPen',
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: corVerde,
                          ),
                        ),
                      ),
                      Switch(
                        value: _vibracaoAtiva,
                        activeColor: corLaranja,
                        onChanged: (val) {
                          setState(() => _vibracaoAtiva = val);
                          if (manager.isConnected) {
                            if (val) {
                              manager.vibrar(1);
                            } else {
                              manager.enviarComando('VIB:0');
                            }
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Teste padrões de vibração no PET FEFO:',
                    style: TextStyle(fontFamily: 'KGPen', fontSize: 14, color: Colors.black87),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton.icon(
                        icon: const Icon(Icons.touch_app_rounded, size: 18),
                        label: const Text('1x Curto', style: TextStyle(fontFamily: 'KGPen')),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: corVerde,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          if (manager.isConnected) {
                            manager.vibrar(1);
                          } else {
                            _mostrarAvisoBLE(context);
                          }
                        },
                      ),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.vibration_rounded, size: 18),
                        label: const Text('2x Duplo', style: TextStyle(fontFamily: 'KGPen')),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: corLaranja,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          if (manager.isConnected) {
                            manager.vibrar(2);
                          } else {
                            _mostrarAvisoBLE(context);
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Card Faces do FEFO
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 8,
                    offset: Offset(0, 3),
                  ),
                ],
                border: Border.all(color: corVerde.withValues(alpha: 0.3), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.face_rounded, color: corLaranja, size: 30),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Exibir Faces no FEFO',
                          style: TextStyle(
                            fontFamily: 'KGPen',
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: corVerde,
                          ),
                        ),
                      ),
                      Switch(
                        value: _facesAtivas,
                        activeColor: corLaranja,
                        onChanged: (val) async {
                          setState(() => _facesAtivas = val);
                          if (manager.isConnected) {
                            await manager.setFaceMode(val);
                          } else {
                            _mostrarAvisoBLE(context);
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Ative ou desative as expressões faciais na tela da CYD do FEFO.',
                    style: TextStyle(fontFamily: 'KGPen', fontSize: 14, color: Colors.black87),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: BotaoPincelada(
                      texto: 'Galeria de Faces',
                      cor: corLaranja,
                      fontSize: 24,
                      aoPressionar: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const TelaFacesFefo()),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  void _mostrarAvisoBLE(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Conecte ao PET FEFO via Bluetooth para testar.'),
        backgroundColor: Color(0xFFDC4900),
      ),
    );
  }
}
