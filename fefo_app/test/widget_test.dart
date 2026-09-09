// Arquivo: test/widget_test.dart

import 'package:fefoflutterv1/main.dart';
import 'package:fefoflutterv1/managers/bluetooth_manager.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:fefoflutterv1/theme/fefo_theme.dart';

void main() {
  testWidgets('App inicia sem quebrar', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => BluetoothManager()),
          ChangeNotifierProvider(create: (_) => FefoThemeController()),
        ],
        child: const MyApp(),
      ),
    );

    expect(find.text('Conectar'), findsOneWidget);
    expect(find.text('FEFO desconectado'), findsOneWidget);
  });
}
