// lib/widgets/mini_player.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../managers/bluetooth_manager.dart';

class MiniPlayer extends StatefulWidget {
  const MiniPlayer({super.key});

  @override
  State<MiniPlayer> createState() => _MiniPlayerState();
}

class _MiniPlayerState extends State<MiniPlayer> {
  double? _draggedProgress;
  bool _mostrandoVolume = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<BluetoothManager>(
      builder: (context, manager, _) {
        final temAudioAtivo = manager.caminhoAudioAtivo != null &&
            manager.caminhoAudioAtivo!.isNotEmpty;

        if (!temAudioAtivo && !manager.audioPlaying && !manager.audioPaused) {
          return const SizedBox.shrink();
        }

        final progress = _draggedProgress ?? manager.audioProgress;
        const corVerdeCard = Color(0xFFFFE7C2);
        const corLaranja = Color(0xFFDC4900);

        final IconData iconeVolume;
        if (manager.audioVolume == 0) {
          iconeVolume = Icons.volume_off_rounded;
        } else if (manager.audioVolume <= 50) {
          iconeVolume = Icons.volume_down_rounded;
        } else {
          iconeVolume = Icons.volume_up_rounded;
        }

        return Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          decoration: BoxDecoration(
            color: corVerdeCard,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Colors.black38,
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Row(
                  children: [
                    const Icon(Icons.music_note_rounded,
                        color: corLaranja, size: 24),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        manager.audioAtivoTitulo,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF5A2A00),
                          fontFamily: 'KGPen',
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${manager.posTimeFormatted} / ${manager.totalTimeFormatted}',
                      style: TextStyle(
                        color: const Color(0xFF5A2A00).withValues(alpha: 0.75),
                        fontFamily: 'KGPen',
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              // Slider de progresso do áudio com busca por soltura (onChangeEnd)
              SliderTheme(
                data: SliderThemeData(
                  trackHeight: 4,
                  thumbShape:
                      const RoundSliderThumbShape(enabledThumbRadius: 7),
                  overlayShape:
                      const RoundSliderOverlayShape(overlayRadius: 14),
                  activeTrackColor: corLaranja,
                  inactiveTrackColor: const Color(0xFFB9682B).withValues(alpha: 0.25),
                  thumbColor: corLaranja,
                  overlayColor: corLaranja.withValues(alpha: 0.2),
                ),
                child: Slider(
                  value: progress.clamp(0.0, 1.0),
                  onChanged: (val) {
                    setState(() => _draggedProgress = val);
                  },
                  onChangeEnd: (val) async {
                    setState(() => _draggedProgress = null);
                    await manager.seekAudio(val * 100);
                  },
                ),
              ),

              // Controles e controle de volume exposto
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                child: Column(
                  children: [
                    if (_mostrandoVolume)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Row(
                          children: [
                            Icon(iconeVolume, color: const Color(0xFF5A2A00), size: 20),
                            Expanded(
                              child: SliderTheme(
                                data: SliderThemeData(
                                  trackHeight: 3,
                                  thumbShape: const RoundSliderThumbShape(
                                      enabledThumbRadius: 6),
                                  activeTrackColor: const Color(0xFF5A2A00),
                                  inactiveTrackColor: const Color(0xFFB9682B).withValues(alpha: 0.25),
                                  thumbColor: const Color(0xFF5A2A00),
                                ),
                                child: Slider(
                                  value: manager.audioVolume.toDouble(),
                                  min: 0,
                                  max: 100,
                                  onChanged: (val) {
                                    manager.setVolume(val.round());
                                  },
                                ),
                              ),
                            ),
                            Text(
                              '${manager.audioVolume}%',
                              style: const TextStyle(
                                  color: Color(0xFF5A2A00),
                                  fontFamily: 'KGPen',
                                  fontSize: 14),
                            ),
                          ],
                        ),
                      ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Botão de Volume Dinâmico
                        IconButton(
                          tooltip: 'Volume',
                          icon: Icon(iconeVolume, color: const Color(0xFF5A2A00)),
                          onPressed: () {
                            setState(() => _mostrandoVolume = !_mostrandoVolume);
                          },
                        ),
                        // Botões centrais de reprodução
                        Row(
                          children: [
                            // Botão Play / Resume / Pause
                            IconButton(
                              tooltip: manager.audioPaused
                                  ? 'Continuar'
                                  : 'Pausar',
                              icon: Icon(
                                manager.audioPaused
                                    ? Icons.play_arrow_rounded
                                    : Icons.pause_rounded,
                                color: const Color(0xFF5A2A00),
                                size: 32,
                              ),
                              onPressed: () {
                                if (manager.audioPaused) {
                                  manager.resumeAudio();
                                } else {
                                  manager.pauseAudio();
                                }
                              },
                            ),
                            const SizedBox(width: 8),
                            // Botão Parar
                            IconButton(
                              tooltip: 'Parar Áudio',
                              icon: const Icon(
                                Icons.stop_rounded,
                                color: Colors.redAccent,
                                size: 30,
                              ),
                              onPressed: () => manager.stopAudio(),
                            ),
                          ],
                        ),
                        const SizedBox(width: 48), // Balanceamento visual
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
