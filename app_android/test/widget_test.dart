// Arquivo: test/widget_test.dart

import 'package:fefoflutterv1/main.dart';
import 'package:fefoflutterv1/managers/bluetooth_manager.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('App inicia sem quebrar', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => BluetoothManager(),
        child: const MyApp(),
      ),
    );

    expect(find.text('Conectar'), findsOneWidget);
    expect(find.textContaining('App v063'), findsOneWidget);
  });
}
