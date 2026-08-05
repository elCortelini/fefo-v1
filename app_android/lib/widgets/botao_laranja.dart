// lib/widgets/botao_laranja.dart
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'dart:math';

const Color corLaranja = Color(0xFFDC4900);
const Color corLaranjaClick = Color(0xFFF89261);
const Color corTextoBotao = Colors.white;

// Criamos uma única instância para ser reutilizada. É a forma mais eficiente.
final _player = AudioPlayer();
// Criamos uma única instância para o gerador aleatório.
final _random = Random();

class BotaoLaranja extends StatelessWidget {
  final String texto;
  final VoidCallback aoPressionar;
  final double? larguraPercentual;

  const BotaoLaranja({
    super.key,
    required this.texto,
    required this.aoPressionar,
    this.larguraPercentual,
  });

  // Função para tocar som, agora mais robusta
  Future<void> _tocarSom() async {
    final List<String> sonsDeClique = [
      'sounds/miado.mp3', // Som 1
      'sounds/pru.mp3', // Som 2
    ];

    try {
      // =======================================================================
      // MUDANÇA CRÍTICA: Garante que qualquer som tocando pare antes.
      // Isso evita que o player entre em um estado inconsistente.
      // =======================================================================
      await _player.stop();

      final indiceAleatorio = _random.nextInt(sonsDeClique.length);
      final somEscolhido = sonsDeClique[indiceAleatorio];

      print('Sorteado e tocando: $somEscolhido');

      // Toca o novo som
      await _player.play(AssetSource(somEscolhido),
          mode: PlayerMode.lowLatency);
    } catch (e) {
      print("Erro ao tocar o som: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final double larguraDaTela = MediaQuery.of(context).size.width;

    final Widget botao = ElevatedButton(
      // A função onPressed agora chama a função async _tocarSom
      onPressed: () {
        _tocarSom();
        aoPressionar();
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: corLaranja,
        foregroundColor: corLaranjaClick,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(50.0),
        ),
        padding: const EdgeInsets.symmetric(vertical: 12),
        alignment: Alignment.center,
      ),
      child: Text(
        texto,
        style: const TextStyle(
          fontFamily: 'Billotilde',
          color: corTextoBotao,
          fontSize: 48,
          height: 1,
        ),
        textAlign: TextAlign.center,
      ),
    );

    if (larguraPercentual != null) {
      return Center(
        child: SizedBox(
          width: larguraDaTela * larguraPercentual!,
          child: botao,
        ),
      );
    } else {
      return Center(child: botao);
    }
  }
}
