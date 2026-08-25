// lib/widgets/aviso_bem_vindo_dialog.dart

import 'package:flutter/material.dart';

class AvisoBemVindoDialog extends StatelessWidget {
  const AvisoBemVindoDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return AlertDialog(
      // Cantos arredondados para um visual mais suave
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      // Sem padding para a imagem poder tocar as bordas superiores
      contentPadding: EdgeInsets.zero,
      content: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: [scheme.surface, theme.scaffoldBackgroundColor],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min, // Faz o pop-up se ajustar ao conteúdo
          children: [
            // Ícone ou Imagem no topo
            Container(
              padding: const EdgeInsets.all(0),
              decoration: const BoxDecoration(
                //color: Color(0xFF318134), // Cor principal do seu app
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(
                    15.0), // Arredonda os cantos da imagem se necessário
                // ================================================================
                // ÁREA DE ALTERAÇÃO DA IMAGEM
                // 1. O Ícone foi substituído por Image.asset.
                // 2. Certifique-se que o caminho 'assets/images/fefo.png' está correto
                //    e que a imagem foi adicionada no seu arquivo pubspec.yaml.
                child: Image.asset(
                  'assets/images/fefo.png',
                  // 3. Altere o valor de 'height' abaixo para ajustar o tamanho da imagem.
                  height: 250, // <<< AJUSTE O TAMANHO DA IMAGEM AQUI
                ),
                // ================================================================
              ),
            ),
            const SizedBox(height: 20),

            // Mensagem Principal
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: RichText(
                textAlign: TextAlign.center,
                text: TextSpan(
                  style: TextStyle(
                      fontFamily: 'KGPen',
                      fontSize: 16,
                      color: scheme.onSurface,
                      height: 1.4),
                  children: [
                    TextSpan(
                      text: 'Seja bem-vindo ao aplicativo ',
                    ),
                    TextSpan(
                      text: 'FEFO!\n\n',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    TextSpan(
                      text:
                          'Lembre-se que ele é uma ferramenta assistiva de apoio emocional para o autista, mas ',
                    ),
                    TextSpan(
                      text: 'não substitui a supervisão de um adulto',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: scheme.secondary),
                    ),
                    TextSpan(
                      text: ', que deverá estar sempre presente.',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.0),
              child: Text(
                'Estamos aqui para garantir uma experiência divertida e segura!',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontFamily: 'KGPen',
                    fontSize: 14,
                    color: scheme.onSurface.withValues(alpha: .7),
                    fontStyle: FontStyle.italic),
              ),
            ),
            const SizedBox(height: 24),

            // Botão para fechar
            Padding(
              padding: const EdgeInsets.only(bottom: 20.0),
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: scheme.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(50),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 30, vertical: 10),
                ),
                child: Text(
                  'Entendi',
                  style: TextStyle(
                      color: scheme.onPrimary,
                      fontFamily: 'Billotilde',
                      fontSize: 40),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
