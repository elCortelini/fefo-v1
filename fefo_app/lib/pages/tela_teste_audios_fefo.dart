// lib/pages/tela_teste_audios_fefo.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';
import '../widgets/pagina_base.dart';

class TelaTesteAudiosFefo extends StatelessWidget {
  const TelaTesteAudiosFefo({super.key});

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      mostrarBotaoVoltar: true,
      child: Consumer<BluetoothManager>(
        builder: (context, bluetoothManager, child) {
          final audios = [...bluetoothManager.audioItems]
            ..sort((a, b) => a.fileName.compareTo(b.fileName));

          return Column(
            children: [
              const SizedBox(height: 25),
              const Text(
                'Teste de Áudios',
                style: TextStyle(
                  fontFamily: 'Billotilde',
                  fontSize: 55,
                  height: 1.0,
                  color: Theme.of(context).colorScheme.secondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  bluetoothManager.isConnected
                      ? 'Encontrados no FEFO: ${audios.length}\n${bluetoothManager.statusMensagem}'
                      : 'Conecte ao FEFO para carregar os áudios do SDCard.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontFamily: 'KGPen',
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: audios.isEmpty
                    ? const Center(
                        child: Text(
                          'Nenhum áudio recebido ainda.\n\nToque em Atualizar catálogo depois de conectar.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white70,
                            fontFamily: 'KGPen',
                            fontSize: 20,
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        itemCount: audios.length,
                        itemBuilder: (context, index) {
                          final audio = audios[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12.0),
                            child: BotaoPlayer(
                              legenda: '${audio.title}  (${audio.path})',
                              caminhoArquivoPlay: audio.token,
                              larguraIcone: 38,
                            ),
                          );
                        },
                      ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 15.0, top: 12.0),
                child: Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    BotaoVerde(
                      texto: 'Atualizar',
                      larguraPercentual: 0.42,
                      aoPressionar: () {
                        bluetoothManager.enviarComando('APP SYNC');
                        bluetoothManager.enviarComando('CATALOG GET');
                      },
                    ),
                    BotaoVerde(
                      texto: 'Parar',
                      larguraPercentual: 0.35,
                      cor: const Color(0xFFDC4900),
                      aoPressionar: bluetoothManager.stopAudio,
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
