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
  log("BACKGROUND: Alarme disparado id=${notificationResponse.id}");
}

Future<void> _solicitarTodasPermissoes() async {
  try {
    await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.bluetoothAdvertise,
      Permission.location,
      Permission.locationWhenInUse,
      Permission.nearbyWifiDevices,
      Permission.notification,
    ].request();
  } catch (e) {
    log("FEFO: Erro permissões: $e");
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  try {
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
  } catch (e) {
    log("FEFO: Falha no init TimeZone: $e");
  }

  final bluetoothManager = BluetoothManager();

  runApp(
    ChangeNotifierProvider(
      create: (context) => bluetoothManager,
      child: const MyApp(),
    ),
  );

  // Inicialização segura após o carregamento da UI
  Future.microtask(() async {
    try {
      await AlarmService.instance.init(bluetoothManager);
    } catch (e) {
      log("FEFO: Erro ao inicializar AlarmService: $e");
    }
    try {
      await _solicitarTodasPermissoes();
    } catch (e) {
      log("FEFO: Erro ao solicitar permissões: $e");
    }
  });
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
  Widget build(BuildContext context) {
    _manager = Provider.of<BluetoothManager>(context);

    if (_manager!.isConnected != _wasConnected) {
      final lostConnection = _wasConnected &&
          !_manager!.isConnected &&
          _manager!.consumeUnexpectedDisconnect();
      _wasConnected = _manager!.isConnected;

      if (lostConnection) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _navigatorKey.currentState?.popUntil((route) => route.isFirst);
          final context = _navigatorKey.currentContext;
          if (context != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content:
                    Text('Conexão com o FEFO perdida. Tentando reconectar...'),
                backgroundColor: Colors.red,
                duration: Duration(seconds: 5),
              ),
            );
          }
        });
      }

      if (_manager!.isConnected && _returnAfterUpdate) {
        _returnTimer?.cancel();
        _returnTimer = Timer(const Duration(seconds: 1), () {
          if (!mounted) return;
          _returnAfterUpdate = false;
          _navigatorKey.currentState?.popUntil((route) => route.isFirst);
        });
      }
    }

    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'FEFO',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF318134)),
        useMaterial3: true,
      ),
      home: const TelaInicial(),
    );
  }
}
