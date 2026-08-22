// lib/pages/tela_desafio.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../managers/bluetooth_manager.dart';
import '../widgets/pagina_base.dart';
import '../widgets/botao_player.dart';
import '../widgets/botao_verde.dart';

// A estrutura de dados para o Desafio permanece a mesma
class Desafio {
  final String caminhoArquivo;
  final String legenda;

  const Desafio({required this.caminhoArquivo, required this.legenda});
}

class TelaDesafios extends StatelessWidget {
  TelaDesafios({super.key});

  // ======================================================================
  // LISTA DE DESAFIOS COM OS CAMINHOS DE ÁUDIO ATUALIZADOS
  // ======================================================================
  final List<Desafio> _listaDeDesafios = const [
    Desafio(
        caminhoArquivo: '/desafio/desafio01.wav',
        legenda: 'Respire fundo - pasta 01'),
    Desafio(
        caminhoArquivo: '/desafio/desafio02.wav',
        legenda: 'Fico feliz por você! - pasta 01'),
    Desafio(
        caminhoArquivo: '/desafio/desafio03.wav',
        legenda: 'Vamos fazer juntos - pasta 02'),
    Desafio(
        caminhoArquivo: '/desafio/desafio04.wav',
        legenda: 'Respeitar os colegas - pasta 02'),
    Desafio(
        caminhoArquivo: '/desafio/desafio05.wav', legenda: 'Mexendo os braços'),
    Desafio(
        caminhoArquivo: '/desafio/desafio06.wav', legenda: 'Pegando objetos'),
    Desafio(caminhoArquivo: '/desafio/desafio07.wav', legenda: 'Alongamentos'),
    Desafio(
        caminhoArquivo: '/desafio/desafio08.wav', legenda: 'Textura nos pés'),
    Desafio(
        caminhoArquivo: '/desafio/desafio09.wav', legenda: 'Pulo coordenado'),
    Desafio(
        caminhoArquivo: '/desafio/desafio10.wav',
        legenda: 'Consciência corporal'),
    Desafio(caminhoArquivo: '/desafio/desafio11.wav', legenda: 'Respiração I'),
    Desafio(caminhoArquivo: '/desafio/desafio12.wav', legenda: 'Respiração II'),
    Desafio(
        caminhoArquivo: '/desafio/desafio13.wav', legenda: 'Respiração III'),
    Desafio(caminhoArquivo: '/desafio/desafio14.wav', legenda: 'Respiração IV'),
    Desafio(caminhoArquivo: '/desafio/desafio15.wav', legenda: 'Faça caretas'),
    Desafio(
        caminhoArquivo: '/desafio/desafio16.wav',
        legenda: 'Careta dos animais'),
    Desafio(
        caminhoArquivo: '/desafio/desafio17.wav',
        legenda: 'Reconhecendo expressões'),
  ];

  @override
  Widget build(BuildContext context) {
    return PaginaBase(
      // ======================================================================
      // LAYOUT ALTERADO AQUI: para ser idêntico à tela_meu_corpo
      // Usamos Column + Expanded + ListView.builder
      // ======================================================================
      child: Column(
        children: [
          const SizedBox(height: 30),
          // --- TÍTULO DA PÁGINA ---
          Text(
            'Desafios e Brincadeiras',
            style: TextStyle(
              fontFamily: 'Billotilde',
              fontSize: 52,
              height: 1.1,
              color: Theme.of(context).colorScheme.secondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),

          // --- CONTROLE DE VOLUME (usa Consumer para reconstruir só o necessário) ---
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Consumer<BluetoothManager>(
              builder: (context, manager, child) {
                // Mostra o controle de volume apenas se estiver conectado
                return manager.isConnected
                    ? _ControleVolume()
                    : const SizedBox.shrink();
              },
            ),
          ),
          const SizedBox(height: 20),

          // A lista de botões agora usa ListView.builder dentro de um Expanded
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              itemCount: _listaDeDesafios.length,
              itemBuilder: (context, index) {
                final desafio = _listaDeDesafios[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 15.0),
                  child: BotaoPlayer(
                    caminhoArquivoPlay: desafio.caminhoArquivo,
                    legenda: desafio.legenda,
                    larguraIcone: 40, // Definindo um tamanho padrão
                  ),
                );
              },
            ),
          ),

          // --- BOTÃO VOLTAR ---
          Padding(
            padding: const EdgeInsets.only(bottom: 15.0, top: 15.0),
            child: BotaoVerde(
              texto: 'Voltar',
              larguraPercentual: 0.5,
              aoPressionar: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}

// --- WIDGET PARA O CONTROLE DE VOLUME (sem alterações) ---
class _ControleVolume extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white30),
      ),
      child: Column(
        children: [
          const Text(
            "Volume do Dispositivo",
            style: TextStyle(
              fontFamily: 'KGPen',
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          Row(
            children: [
              const Icon(Icons.volume_mute_rounded, color: Colors.white),
              Expanded(
                child: _VolumeSlider(),
              ),
              const Icon(Icons.volume_up_rounded, color: Colors.white),
            ],
          ),
        ],
      ),
    );
  }
}

// --- WIDGET PARA O SLIDER DO VOLUME (sem alterações) ---
class _VolumeSlider extends StatefulWidget {
  @override
  _VolumeSliderState createState() => _VolumeSliderState();
}

class _VolumeSliderState extends State<_VolumeSlider> {
  double _currentVolume = 50.0;
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bluetoothManager = context.read<BluetoothManager>();

    return Slider(
      value: _currentVolume,
      min: 0,
      max: 100,
      divisions: 20,
      label: _currentVolume.round().toString(),
      activeColor: const Color(0xFF4CAF50),
      inactiveColor: Colors.white38,
      onChanged: (double value) {
        setState(() {
          _currentVolume = value;
        });

        if (_debounce?.isActive ?? false) _debounce?.cancel();
        _debounce = Timer(const Duration(milliseconds: 250), () {
          bluetoothManager.enviarComandoDeVolume(value.round());
        });
      },
    );
  }
}
