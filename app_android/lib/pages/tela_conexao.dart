// lib/pages/tela_conexao.dart

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';

class TelaConexao extends StatefulWidget {
  const TelaConexao({super.key});

  @override
  State<TelaConexao> createState() => _TelaConexaoState();
}

class _TelaConexaoState extends State<TelaConexao> {
  List<ScanResult> _devicesList = [];
  bool _isCarregando = false;

  @override
  void initState() {
    super.initState();
  }

  Future<void> _buscarFefoBle() async {
    if (_isCarregando) return;
    setState(() => _isCarregando = true);

    try {
      final manager = context.read<BluetoothManager>();
      await manager.carregarDispositivosPareados();

      if (mounted) {
        setState(() {
          _devicesList = manager.devicesList;
          _isCarregando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isCarregando = false);
        _mostrarMensagem('Erro ao buscar FEFO BLE. Ative o Bluetooth.');
      }
    }
  }

  Future<void> _conectar(ScanResult result) async {
    _mostrarMensagem('Conectando ao FEFO...');
    await context.read<BluetoothManager>().connectToDevice(result);

    if (!mounted) return;
    final manager = context.read<BluetoothManager>();

    if (manager.isConnected) {
      _mostrarMensagem('Conectado por BLE!', sucesso: true);
      Navigator.pop(context);
    } else {
      _mostrarMensagem('Falha ao conectar. Tente novamente.', erro: true);
    }
  }

  void _mostrarMensagem(
    String texto, {
    bool erro = false,
    bool sucesso = false,
  }) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(texto, style: const TextStyle(fontFamily: 'KGPen')),
        backgroundColor: erro
            ? Colors.red.shade800
            : (sucesso ? Colors.green.shade700 : Colors.blueGrey.shade800),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color corVerde = Color(0xFF318134);
    const Color corLaranja = Color(0xFFDC4900);

    return PaginaBase(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          children: [
            const SizedBox(height: 20),
            const Text(
              'Conectar FEFO',
              style: TextStyle(
                fontFamily: 'Billotilde',
                fontSize: 60,
                color: corVerde,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 25),
            BotaoPincelada(
              texto: 'Buscar FEFO BLE',
              cor: corLaranja,
              aoPressionar: _buscarFefoBle,
            ),
            const SizedBox(height: 30),
            const Divider(color: Colors.white24, thickness: 1.5),
            Consumer<BluetoothManager>(
              builder: (context, manager, _) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Text(
                    manager.statusMensagem,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontFamily: 'KGPen',
                      fontSize: 17,
                    ),
                  ),
                );
              },
            ),
            Expanded(
              child: _isCarregando
                  ? const Center(
                      child: CircularProgressIndicator(color: corVerde))
                  : _devicesList.isEmpty
                      ? const Center(
                          child: Text(
                            'Nenhum FEFO BLE encontrado.\n\nLigue/reset a CYD e toque em Buscar FEFO BLE.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white70,
                              fontFamily: 'KGPen',
                              fontSize: 18,
                            ),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _devicesList.length,
                          itemBuilder: (context, index) {
                            final result = _devicesList[index];
                            final manager = context.read<BluetoothManager>();
                            final nome = manager.nomeDoDispositivo(result);
                            final isFefo = nome.toUpperCase().contains('FEFO');

                            return Card(
                              color: isFefo
                                  ? corVerde.withValues(alpha: 0.85)
                                  : Colors.black45,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(15),
                              ),
                              margin: const EdgeInsets.symmetric(vertical: 6),
                              child: ListTile(
                                leading: Icon(
                                  Icons.bluetooth_connected,
                                  color: isFefo ? Colors.white : Colors.white54,
                                  size: 30,
                                ),
                                title: Text(
                                  nome,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 20,
                                  ),
                                ),
                                subtitle: Text(
                                  result.device.remoteId.toString(),
                                  style: const TextStyle(color: Colors.white70),
                                ),
                                onTap: () => _conectar(result),
                              ),
                            );
                          },
                        ),
            ),
            BotaoPincelada(
              texto: 'Voltar',
              cor: corVerde,
              larguraPercentual: 0.72,
              aoPressionar: () => Navigator.pop(context),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
