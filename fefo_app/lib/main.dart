import 'dart:async';
import 'dart:developer';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:permission_handler/permission_handler.dart';

import 'pages/tela_inicial.dart';
import 'managers/bluetooth_manager.dart';
import 'services/alarm_service.dart';
import 'widgets/aviso_bem_vindo_dialog.dart';

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse notificationResponse) {
  log("BACKGROUND: Alarme disparado.");
  AlarmService.backgroundCallback(notificationResponse);
}

Future<void> _solicitarTodasPermissoes() async {
  await [
    Permission.bluetoothScan,
    Permission.bluetoothConnect,
    Permission.bluetoothAdvertise,
    Permission.location,
    Permission.locationWhenInUse,
    Permission.nearbyWifiDevices,
    Permission.notification,
  ].request();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  await _solicitarTodasPermissoes();

  tz.initializeTimeZones();
  try {
    final dynamic tzData = await FlutterTimezone.getLocalTimezone();
    final String timeZoneName = tzData.toString();
    tz.setLocalLocation(tz.getLocation(timeZoneName));
    log("FEFO: Timezone configurada para $timeZoneName");
  } catch (e) {
    log("FEFO: Erro timezone, usando fallback: $e");
    tz.setLocalLocation(tz.getLocation('America/Sao_Paulo'));
  }

  final bluetoothManager = BluetoothManager();
  final alarmService = AlarmService.instance;
  await alarmService.init(bluetoothManager);

  runApp(
    ChangeNotifierProvider(
      create: (context) => bluetoothManager,
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  BluetoothManager? _manager;
  bool _wasConnected = false;
  bool _returnAfterUpdate = false;
  Timer? _returnTimer;
  bool _welcomeShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _showWelcome());
  }

  Future<void> _showWelcome() async {
    if (_welcomeShown) return;
    final context = _navigatorKey.currentContext;
    if (context == null) return;
    _welcomeShown = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const AvisoBemVindoDialog(),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final manager = context.read<BluetoothManager>();
    if (identical(manager, _manager)) return;
    _manager?.removeListener(_onBluetoothChanged);
    _manager = manager;
    _wasConnected = manager.isConnected;
    manager.addListener(_onBluetoothChanged);
  }

  void _onBluetoothChanged() {
    final connected = _manager?.isConnected ?? false;
    if (_wasConnected && !connected) {
      if (_manager?.uploading == true) {
        _returnAfterUpdate = true;
      } else {
        _returnToStart();
      }
    }
    if (_returnAfterUpdate && !connected && _manager?.uploading == false) {
      _returnAfterUpdate = false;
      _returnTimer?.cancel();
      // Tanto no sucesso quanto na falha o BLE foi desligado pelo FEFO para a
      // sessao Wi-Fi. Mantemos o resultado visivel por alguns segundos e só
      // então voltamos à tela de conexão para uma nova sincronização.
      final delay = _manager?.lastTransferSucceeded == true
          ? const Duration(seconds: 3)
          : const Duration(seconds: 7);
      _returnTimer = Timer(delay, _returnToStart);
    }
    _wasConnected = connected;
  }

  void _returnToStart() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _navigatorKey.currentState?.popUntil((route) => route.isFirst);
    });
  }

  @override
  void dispose() {
    _manager?.removeListener(_onBluetoothChanged);
    _returnTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      debugShowCheckedModeBanner: false,
      title: 'FEFO App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.orange),
        useMaterial3: true,
      ),
      home: const TelaInicial(),
    );
  }
}
