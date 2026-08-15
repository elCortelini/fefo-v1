import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_pincelada.dart';
import '../widgets/pagina_base.dart';
import 'tela_conexao.dart';
import 'tela_menu.dart';

class TelaInicial extends StatelessWidget {
  const TelaInicial({super.key});

  @override
  Widget build(BuildContext context) {
    final manager = context.watch<BluetoothManager>();
    const laranja = Color(0xFFDC4900);
    const verde = Color(0xFF318134);

    return PaginaBase(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          children: [
            const SizedBox(height: 40),
            Image.asset('assets/images/logo.png', height: 180),
            Image.asset('assets/images/fefo.png', height: 350),
            const SizedBox(height: 15),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFDC4900).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFDC4900), width: 1.4),
              ),
              child: Column(
                children: [
                  const Text(
                    'FEFO App v057 (1.0.57+57)',
                    style: TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFDC4900),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'PET FEFO Firmware v${manager.firmwareVersion ?? '0.0.71'}',
                    style: const TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 13,
                      color: verde,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 25),
            BotaoPincelada(
              texto: manager.isConnected ? 'Desconectar' : 'Conectar',
              cor: laranja,
              larguraPercentual: 0.88,
              aoPressionar: () {
                if (manager.isConnected) {
                  manager.disconnectFromDevice();
                } else {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const TelaConexao()),
                  );
                }
              },
            ),
            const SizedBox(height: 15),
            BotaoPincelada(
              texto: 'Menu',
              cor: laranja,
              aoPressionar: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const TelaMenu()),
              ),
            ),
            const SizedBox(height: 40),
            if (Platform.isAndroid)
              const BotaoPincelada(
                texto: 'Sair',
                cor: verde,
                larguraPercentual: 0.72,
                aoPressionar: SystemNavigator.pop,
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
