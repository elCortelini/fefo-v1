import 'package:flutter/material.dart';

class ControleDeslizante extends StatelessWidget {
  final String titulo;
  final int valor;
  final ValueChanged<int> aoAlterar;
  final bool habilitado;

  const ControleDeslizante({
    super.key,
    required this.titulo,
    required this.valor,
    required this.aoAlterar,
    this.habilitado = true,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
      child: Column(
        children: [
          Text(
            '$titulo: $valor%',
            style: const TextStyle(
              fontFamily: 'KGPen',
              fontSize: 22,
              color: Color(0xFF4B5563),
            ),
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: const Color(0xFFDC4900),
              inactiveTrackColor: const Color(0xFFFFD89A),
              thumbColor: const Color(0xFFDC4900),
              overlayColor: const Color(0x33DC4900),
              trackHeight: 7,
            ),
            child: Slider(
              value: valor.clamp(0, 100).toDouble(),
              min: 0,
              max: 100,
              divisions: 100,
              onChanged: habilitado ? (v) => aoAlterar(v.round()) : null,
            ),
          ),
        ],
      ),
    );
  }
}
