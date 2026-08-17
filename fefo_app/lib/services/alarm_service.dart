// lib/services/alarm_service.dart

import 'dart:async';
import 'dart:developer';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:permission_handler/permission_handler.dart';

import '../models/alarm_model.dart';
import '../managers/bluetooth_manager.dart';
import '../services/database_service.dart';
import '../main.dart' as main_app;

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

class AlarmService {
  AlarmService._privateConstructor();
  static final AlarmService instance = AlarmService._privateConstructor();

  BluetoothManager? _bluetoothManager;
  Timer? _timerChecagemLocal;
  final Set<String> _alarmesTocadosNesteMinuto = {};

  Future<void> init(BluetoothManager? bluetoothManager) async {
    if (bluetoothManager != null) {
      _bluetoothManager = bluetoothManager;
    }

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);

    try {
      await flutterLocalNotificationsPlugin.initialize(
        initializationSettings,
        onDidReceiveNotificationResponse:
            (NotificationResponse response) async {
          try {
            await flutterLocalNotificationsPlugin.cancel(response.id ?? 0);
          } catch (_) {}

          final String? payload = response.payload;
          _executarAudioAlarme(payload);
        },
        onDidReceiveBackgroundNotificationResponse:
            main_app.notificationTapBackground,
      );
    } catch (e) {
      log("FEFO: Erro ao inicializar flutterLocalNotificationsPlugin: $e");
    }

    if (Platform.isAndroid) {
      try {
        await Permission.notification.request();
        await Permission.scheduleExactAlarm.request();
      } catch (_) {}

      try {
        final androidImplementation = flutterLocalNotificationsPlugin
            .resolvePlatformSpecificImplementation<
                AndroidFlutterLocalNotificationsPlugin>();

        if (androidImplementation != null) {
          const AndroidNotificationChannel channel = AndroidNotificationChannel(
            'alarm_channel_unique_id',
            'Alarmes Críticos do FEFO',
            importance: Importance.high,
            playSound: true,
            enableVibration: true,
          );
          await androidImplementation.createNotificationChannel(channel);
        }
      } catch (e) {
        log("FEFO: Erro ao criar canal de notificação: $e");
      }
    }

    await _reagendarAlarmesSalvos();
    _iniciarMotorChecagemLocal();
  }

  Future<void> _reagendarAlarmesSalvos() async {
    try {
      final alarmes = await DatabaseService.instance.readAll();
      for (final alarme in alarmes.where((item) => item.isActive)) {
        await agendarAlarme(alarme);
      }
    } catch (e) {
      log('FEFO: Erro ao reagendar alarmes salvos: $e');
    }
  }

  void _iniciarMotorChecagemLocal() {
    _timerChecagemLocal?.cancel();
    _timerChecagemLocal =
        Timer.periodic(const Duration(seconds: 10), (_) async {
      try {
        final agora = DateTime.now();
        final chaveMinuto = "${agora.hour}:${agora.minute}";

        final list = await DatabaseService.instance.readAll();
        for (final alarme in list) {
          if (!alarme.isActive) continue;

          final ehHora =
              alarme.hour == agora.hour && alarme.minute == agora.minute;
          if (!ehHora) continue;

          bool diaValido = alarme.daysOfWeek.isEmpty ||
              alarme.daysOfWeek.contains(agora.weekday);
          if (!diaValido) continue;

          final idChave = "${alarme.id ?? alarme.title}_$chaveMinuto";
          if (!_alarmesTocadosNesteMinuto.contains(idChave)) {
            _alarmesTocadosNesteMinuto.add(idChave);
            _executarAudioAlarme('P:${alarme.audioPath}');
          }
        }

        if (_alarmesTocadosNesteMinuto.length > 50) {
          _alarmesTocadosNesteMinuto.clear();
        }
      } catch (e) {
        log("FEFO: Erro no motor de checagem local de alarmes: $e");
      }
    });
  }

  Future<void> _executarAudioAlarme(String? payload) async {
    try {
      if (_bluetoothManager != null &&
          _bluetoothManager!.isConnected &&
          payload != null &&
          payload.startsWith('P:')) {
        await _bluetoothManager!.enviarComando(payload);
      }
      // Quando o App está em segundo plano ou sem Bluetooth, o próprio canal
      // da notificação Android reproduz o som do alarme. Não inicializamos um
      // player Flutter aqui, pois esse callback também pode ocorrer em estado
      // de background e não deve derrubar o processo do App.
    } catch (e) {
      log("FEFO: Erro ao executar áudio do alarme: $e");
    }
  }

  Future<void> _dispararNotificacao({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime scheduledDate,
    String? payload,
  }) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'alarm_channel_unique_id',
        'Alarmes Críticos do FEFO',
        importance: Importance.high,
        priority: Priority.high,
        fullScreenIntent: false,
        category: AndroidNotificationCategory.alarm,
        ongoing: false,
        playSound: true,
        enableVibration: true,
      ),
    );

    try {
      await flutterLocalNotificationsPlugin.zonedSchedule(
        id,
        title,
        body,
        scheduledDate,
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: payload,
      );
    } catch (e) {
      log('FEFO: Agendamento exato indisponível; usando modo econômico: $e');
      try {
        await flutterLocalNotificationsPlugin.zonedSchedule(
          id,
          title,
          body,
          scheduledDate,
          details,
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          payload: payload,
        );
      } catch (fallbackError) {
        log('FEFO: Erro ao agendar notificação: $fallbackError');
      }
    }
  }

  Future<void> agendarAlarme(AlarmModel alarme) async {
    final idNotificacao = alarme.id ??
        (alarme.title.hashCode ^ alarme.hour ^ alarme.minute).abs();

    if (!alarme.isActive) {
      await cancelarAlarme(idNotificacao);
      return;
    }

    final agora = tz.TZDateTime.now(tz.local);
    final inicioDoDia = tz.TZDateTime(
      tz.local,
      agora.year,
      agora.month,
      agora.day,
      alarme.hour,
      alarme.minute,
    );
    var horarioFinal = inicioDoDia;
    for (var dias = 0; dias <= 7; dias++) {
      final candidato = inicioDoDia.add(Duration(days: dias));
      final diaValido = alarme.daysOfWeek.isEmpty ||
          alarme.daysOfWeek.contains(candidato.weekday);
      if (diaValido && candidato.isAfter(agora)) {
        horarioFinal = candidato;
        break;
      }
    }

    await _dispararNotificacao(
      id: idNotificacao,
      title: '⏰ ${alarme.title}',
      body: 'O FEFO está te chamando!',
      scheduledDate: horarioFinal,
      payload: 'P:${alarme.audioPath}',
    );
  }

  Future<void> cancelarAlarme(int? id) async {
    if (id == null) return;
    try {
      await flutterLocalNotificationsPlugin.cancel(id);
    } catch (_) {}
  }
}
