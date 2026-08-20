import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_pincelada.dart';
import 'tela_faces_fefo.dart';
import 'tela_vibracoes_fefo.dart';

class TelaConfiguracoes extends StatefulWidget {
  const TelaConfiguracoes({super.key});

  @override
  State<TelaConfiguracoes> createState() => _TelaConfiguracoesState();
}

class _TelaConfiguracoesState extends State<TelaConfiguracoes> {
  bool _vibracaoAtiva = true;
  bool _facesAtivas = true;
  int _ledCount = 35;

  Future<void> _alternarModoDesenvolvedor(
      BuildContext context, BluetoothManager manager, bool enabled) async {
    if (!enabled) {
      await manager.setDeveloperMode(false);
      if (mounted) setState(() {});
      return;
    }
    final controller = TextEditingController();
    final senha = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Modo desenvolvedor'),
        content: TextField(
          controller: controller,
          autofocus: true,
          obscureText: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Senha'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, controller.text),
            child: const Text('Entrar'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (senha != '3616' || !mounted) return;
    if (!manager.isConnected) {
      _mostrarAvisoBLE(context);
      return;
    }
    final ok = await manager.setDeveloperMode(true);
    if (mounted) {
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok
            ? 'Modo desenvolvedor ativado.'
            : 'Não foi possível ativar o modo desenvolvedor.'),
      ));
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final manager = context.read<BluetoothManager>();
      setState(() {
        _facesAtivas = manager.faceModeEnabled;
        _ledCount = manager.ledCount;
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

            Card(
              child: SwitchListTile(
                secondary: const Icon(Icons.developer_mode),
                title: const Text('Modo desenvolvedor'),
                subtitle: Text(manager.developerModeEnabled
                    ? 'Testes e telas de sistema liberados.'
                    : 'Desativado. O FEFO permanece no modo normal.'),
                value: manager.developerModeEnabled,
                onChanged: (value) =>
                    _alternarModoDesenvolvedor(context, manager, value),
              ),
            ),
            const SizedBox(height: 15),

            Card(
              child: ListTile(
                leading: const Icon(Icons.lightbulb_outline),
                title: const Text('Quantidade de LEDs na fita'),
                subtitle: const Text('Padrão: 35 LEDs'),
                trailing: DropdownButton<int>(
                  value: _ledCount,
                  items: const [35, 30, 25, 20, 15]
                      .map((count) => DropdownMenuItem<int>(
                            value: count,
                            child: Text('$count'),
                          ))
                      .toList(),
                  onChanged: manager.isConnected
                      ? (value) async {
                          if (value == null) return;
                          setState(() => _ledCount = value);
                          await manager.setLedCount(value);
                        }
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 15),

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
                border: Border.all(
                    color: corVerde.withValues(alpha: 0.3), width: 1.5),
              ),
              child: ListTile(
                leading: const Icon(Icons.vibration_rounded, color: corLaranja, size: 32),
                title: const Text('Vibrações do PET FEFO', style: TextStyle(fontFamily: 'KGPen', fontSize: 20, fontWeight: FontWeight.bold, color: corVerde)),
                subtitle: const Text('10 padrões intensos de 7 segundos', style: TextStyle(fontFamily: 'KGPen')),
                trailing: const Icon(Icons.chevron_right_rounded, color: corLaranja, size: 32),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TelaVibracoesFefo())),
              ),
            ),

            const SizedBox(height: 20),

            // Submenu de vibrações do FEFO
            if (manager.developerModeEnabled) ...[
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
                  border: Border.all(
                      color: corVerde.withValues(alpha: 0.3), width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.face_rounded,
                            color: corLaranja, size: 30),
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
                      style: TextStyle(
                          fontFamily: 'KGPen',
                          fontSize: 14,
                          color: Colors.black87),
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
                            MaterialPageRoute(
                                builder: (_) => const TelaFacesFefo()),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
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
