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
import 'pages/tela_menu.dart';
import 'managers/bluetooth_manager.dart';
import 'services/alarm_service.dart';
import 'widgets/aviso_bem_vindo_dialog.dart';
import 'theme/fefo_theme.dart';

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
  final themeController = FefoThemeController();
  await themeController.load();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: bluetoothManager),
        ChangeNotifierProvider.value(value: themeController),
      ],
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
    final fefoTheme = context.watch<FefoThemeController>().current;

    if (_manager!.isConnected != _wasConnected) {
      final connectedNow = _manager!.isConnected;
      final wasConnected = _wasConnected;
      final lostConnection = _wasConnected &&
          !_manager!.isConnected &&
          !_manager!.uploading &&
          !_manager!.aguardandoReconexao &&
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

      if (_manager!.isConnected && _manager!.lastTransferSucceeded == true) {
        _manager!.acknowledgeUpdateResult();
        _returnTimer?.cancel();
        _returnTimer = Timer(const Duration(seconds: 1), () {
          if (!mounted) return;
          _returnAfterUpdate = false;
          _navigatorKey.currentState?.popUntil((route) => route.isFirst);
        });
      }

      if (connectedNow && !wasConnected) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted || !_manager!.isConnected) return;
          _navigatorKey.currentState?.pushReplacement(
            MaterialPageRoute(builder: (_) => const TelaMenu()),
          );
        });
      }
    }

    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'FEFO',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: fefoTheme.accent,
          brightness: fefoTheme.isDark ? Brightness.dark : Brightness.light,
        ),
        scaffoldBackgroundColor: fefoTheme.background,
        cardColor: fefoTheme.surface,
        canvasColor: fefoTheme.background,
        textTheme: ThemeData().textTheme.apply(
              bodyColor: fefoTheme.text,
              displayColor: fefoTheme.text,
            ),
        iconTheme: IconThemeData(color: fefoTheme.accentSecondary),
        cardTheme: CardThemeData(
          color: fefoTheme.surface,
          elevation: fefoTheme.useLegacyImage ? 2 : 0,
          margin: const EdgeInsets.symmetric(vertical: 4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
        listTileTheme: ListTileThemeData(
          textColor: fefoTheme.text,
          iconColor: fefoTheme.accentSecondary,
          subtitleTextStyle: TextStyle(color: fefoTheme.mutedText),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: fefoTheme.surface,
          titleTextStyle: TextStyle(color: fefoTheme.text, fontSize: 22, fontWeight: FontWeight.bold),
          contentTextStyle: TextStyle(color: fefoTheme.mutedText, fontSize: 16),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: fefoTheme.surface,
          contentTextStyle: TextStyle(color: fefoTheme.text),
          actionTextColor: fefoTheme.accent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          labelStyle: TextStyle(color: fefoTheme.mutedText),
          hintStyle: TextStyle(color: fefoTheme.mutedText),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: fefoTheme.accent, width: 2),
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: fefoTheme.surface,
          indicatorColor: fefoTheme.accent.withValues(alpha: 0.22),
          labelTextStyle: WidgetStatePropertyAll(TextStyle(color: fefoTheme.text)),
          iconTheme: WidgetStatePropertyAll(IconThemeData(color: fefoTheme.accent)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: fefoTheme.accent,
            foregroundColor: fefoTheme.isDark ? fefoTheme.background : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: fefoTheme.accent,
            foregroundColor: fefoTheme.isDark ? fefoTheme.background : Colors.white,
          ),
        ),
        sliderTheme: SliderThemeData(
          activeTrackColor: fefoTheme.accent,
          thumbColor: fefoTheme.accent,
          inactiveTrackColor: fefoTheme.accent.withValues(alpha: 0.25),
        ),
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) =>
              states.contains(WidgetState.selected) ? fefoTheme.accent : null),
          trackColor: WidgetStateProperty.resolveWith((states) =>
              states.contains(WidgetState.selected) ? fefoTheme.accent.withValues(alpha: 0.45) : null),
        ),
        useMaterial3: true,
      ),
      home: const TelaInicial(),
    );
  }
}
