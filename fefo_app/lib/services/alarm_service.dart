// lib/services/alarm_service.dart

import 'dart:async';
import 'dart:developer';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:permission_handler/permission_handler.dart';

import 'package:audioplayers/audioplayers.dart';
import '../models/alarm_model.dart';
import '../managers/bluetooth_manager.dart';
import '../main.dart' as main_app;

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

class AlarmService {
  AlarmService._privateConstructor();
  static final AlarmService instance = AlarmService._privateConstructor();

  late final BluetoothManager _bluetoothManager;

  Future<void> init(BluetoothManager bluetoothManager) async {
    _bluetoothManager = bluetoothManager;

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);

    await flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) async {
        await flutterLocalNotificationsPlugin.cancel(response.id ?? 0);

        final String? payload = response.payload;

        if (response.actionId == 'snooze') {
          final nextTime =
              tz.TZDateTime.now(tz.local).add(const Duration(minutes: 1));
          await _dispararNotificacao(
            id: response.id ?? 999,
            title: 'Soneca FEFO',
            body: 'A rotina continua!',
            scheduledDate: nextTime,
            payload: payload,
            labelSnooze: 'Soneca (1 min)',
          );
          return;
        }

        if (payload != null && payload.startsWith('P:')) {
          if (_bluetoothManager.isConnected) {
            await _bluetoothManager.enviarComando(payload);
          } else {
            try {
              final player = AudioPlayer();
              await player.play(AssetSource('audios/disco.mp3'));
            } catch (_) {}
          }
        }
      },
      onDidReceiveBackgroundNotificationResponse:
          main_app.notificationTapBackground,
    );

    if (Platform.isAndroid) {
      await Permission.notification.request();
      await Permission.scheduleExactAlarm.request();

      final androidImplementation =
          flutterLocalNotificationsPlugin.resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      if (androidImplementation != null) {
        const AndroidNotificationChannel channel = AndroidNotificationChannel(
          'alarm_channel_unique_id',
          'Alarmes Críticos do FEFO',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
        );
        await androidImplementation.createNotificationChannel(channel);
      }
    }
  }

  Future<void> _dispararNotificacao({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime scheduledDate,
    String? payload,
    String labelSnooze = 'Soneca',
  }) async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'alarm_channel_unique_id',
        'Alarmes Críticos do FEFO',
        importance: Importance.max,
        priority: Priority.max,
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
      log("FEFO: Fallback para agendamento inexato devido a permissão do Android: $e");
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
      } catch (err) {
        log("FEFO: Erro ao agendar notificação: $err");
      }
    }
  }

  Future<void> testeImediato() async {
    final nextTime =
        tz.TZDateTime.now(tz.local).add(const Duration(seconds: 10));
    await _dispararNotificacao(
      id: 888,
      title: '🚨 TESTE FEFO',
      body: 'Som persistente de teste!',
      scheduledDate: nextTime,
      payload: 'P:respire',
      labelSnooze: 'Soneca (10s)',
    );
  }

  static Future<void> backgroundCallback(NotificationResponse response) async {
    WidgetsFlutterBinding.ensureInitialized();
    await flutterLocalNotificationsPlugin.cancel(response.id ?? 0);
    // Nota: O agendamento de comandos Bluetooth em background
    // agora será centralizado no BluetoothManager (Classic).
  }

  Future<void> agendarAlarme(AlarmModel alarme) async {
    if (!alarme.isActive) {
      await cancelarAlarme(alarme.id!);
      return;
    }

    final agora = DateTime.now();
    DateTime dataAlarme;

    if (alarme.daysOfWeek.isEmpty) {
      dataAlarme = DateTime(
          agora.year, agora.month, agora.day, alarme.hour, alarme.minute);
      if (dataAlarme.isBefore(agora)) {
        dataAlarme = dataAlarme.add(const Duration(days: 1));
      }
    } else {
      dataAlarme = DateTime(
          agora.year, agora.month, agora.day, alarme.hour, alarme.minute);
      bool encontrou = false;
      for (int i = 0; i <= 7; i++) {
        DateTime candidato = DateTime(
                agora.year, agora.month, agora.day, alarme.hour, alarme.minute)
            .add(Duration(days: i));
        if (alarme.daysOfWeek.contains(candidato.weekday)) {
          if (candidato.isAfter(agora)) {
            dataAlarme = candidato;
            encontrou = true;
            break;
          }
        }
      }
      if (!encontrou) return;
    }

    final diferenca = dataAlarme.difference(agora);
    final horarioFinal = tz.TZDateTime.now(tz.local).add(diferenca);

    await _dispararNotificacao(
      id: alarme.id ?? 0,
      title: '⏰ ${alarme.title}',
      body: 'O FEFO está te chamando!',
      scheduledDate: horarioFinal,
      payload: 'P:${alarme.audioPath}',
      labelSnooze: 'Soneca (1 min)',
    );
  }

  Future<void> cancelarAlarme(int id) async {
    await flutterLocalNotificationsPlugin.cancel(id);
  }
}
