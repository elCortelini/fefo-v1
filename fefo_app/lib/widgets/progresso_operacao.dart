import 'package:flutter/material.dart';

/// Visual único para download, instalação, atualização e exclusão.
class ProgressoOperacao extends StatelessWidget {
  final String status;
  final double? progresso;

  const ProgressoOperacao({
    super.key,
    required this.status,
    this.progresso,
  });

  @override
  Widget build(BuildContext context) {
    final value = progresso?.clamp(0.0, 1.0);
    return Container(
      margin: const EdgeInsets.fromLTRB(8, 2, 8, 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFD89A),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            status,
            style: const TextStyle(
              fontFamily: 'KGPen',
              fontSize: 22,
              color: Color(0xFF4B5563),
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: value != null && value > 0 ? value : null,
            minHeight: 9,
            borderRadius: BorderRadius.circular(8),
            color: const Color(0xFFDC4900),
            backgroundColor: Colors.white70,
          ),
        ],
      ),
    );
  }
}
