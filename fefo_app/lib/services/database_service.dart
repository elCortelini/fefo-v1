// lib/services/database_service.dart

import 'dart:convert';
import 'dart:developer';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/alarm_model.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;
  static const String _spKey = 'fefo_saved_alarms_v1';

  DatabaseService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('alarms.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(path,
        version: 2, onCreate: _createDB, onUpgrade: _onUpgrade);
  }

  Future _createDB(Database db, int version) async {
    const idType = 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const textType = 'TEXT NOT NULL';
    const boolType = 'BOOLEAN NOT NULL';
    const intType = 'INTEGER NOT NULL';

    await db.execute('''
      CREATE TABLE $tableAlarms ( 
        ${AlarmFields.id} $idType, 
        ${AlarmFields.title} $textType,
        ${AlarmFields.hour} $intType,
        ${AlarmFields.minute} $intType,
        ${AlarmFields.isActive} $boolType,
        ${AlarmFields.audioPath} $textType,
        ${AlarmFields.daysOfWeek} TEXT
      )
    ''');
  }

  Future _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute(
          'ALTER TABLE $tableAlarms ADD COLUMN ${AlarmFields.daysOfWeek} TEXT');
    }
  }

  Future<void> _salvarEmSharedPreferences(List<AlarmModel> alarmes) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = alarmes.map((a) => a.toJson()).toList();
      await prefs.setString(_spKey, jsonEncode(jsonList));
    } catch (e) {
      log("FEFO: Erro ao salvar em SharedPreferences: $e");
    }
  }

  Future<List<AlarmModel>> _lerDeSharedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_spKey);
      if (str == null || str.isEmpty) return [];
      final List<dynamic> jsonList = jsonDecode(str);
      return jsonList
          .map((j) => AlarmModel.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<AlarmModel> create(AlarmModel alarm) async {
    int? insertedId;
    try {
      final db = await instance.database;
      insertedId = await db.insert(tableAlarms, alarm.toJson());
    } catch (e) {
      log("FEFO: Erro ao inserir no SQLite: $e");
    }

    final novoAlarme = alarm.copyWith(
        id: insertedId ?? DateTime.now().millisecondsSinceEpoch ~/ 1000);
    final todos = await readAll();
    todos.add(novoAlarme);
    await _salvarEmSharedPreferences(todos);
    return novoAlarme;
  }

  Future<AlarmModel> read(int id) async {
    final todos = await readAll();
    return todos.firstWhere((a) => a.id == id,
        orElse: () => throw Exception('ID $id not found'));
  }

  Future<List<AlarmModel>> readAll() async {
    List<AlarmModel> alarmes = [];
    try {
      final db = await instance.database;
      const orderBy = '${AlarmFields.hour}, ${AlarmFields.minute} ASC';
      final result = await db.query(tableAlarms, orderBy: orderBy);
      alarmes = result.map((json) => AlarmModel.fromJson(json)).toList();
    } catch (e) {
      log("FEFO: Erro ao ler SQLite: $e");
    }

    if (alarmes.isEmpty) {
      alarmes = await _lerDeSharedPreferences();
    }

    alarmes.sort((a, b) {
      if (a.hour != b.hour) return a.hour.compareTo(b.hour);
      return a.minute.compareTo(b.minute);
    });

    return alarmes;
  }

  Future<int> update(AlarmModel alarm) async {
    try {
      final db = await instance.database;
      if (alarm.id != null) {
        await db.update(
          tableAlarms,
          alarm.toJson(),
          where: '${AlarmFields.id} = ?',
          whereArgs: [alarm.id],
        );
      }
    } catch (_) {}

    final todos = await readAll();
    final idx = todos.indexWhere((a) =>
        a.id == alarm.id ||
        (a.title == alarm.title &&
            a.hour == alarm.hour &&
            a.minute == alarm.minute));
    if (idx != -1) {
      todos[idx] = alarm;
    } else {
      todos.add(alarm);
    }
    await _salvarEmSharedPreferences(todos);
    return 1;
  }

  Future<int> delete(int id) async {
    try {
      final db = await instance.database;
      await db.delete(
        tableAlarms,
        where: '${AlarmFields.id} = ? OR id = ?',
        whereArgs: [id, id],
      );
    } catch (_) {}

    final todos = await readAll();
    todos.removeWhere((a) => a.id == id);
    await _salvarEmSharedPreferences(todos);
    return 1;
  }

  Future<int> deleteByTitleAndTime(String title, int hour, int minute) async {
    try {
      final db = await instance.database;
      await db.delete(
        tableAlarms,
        where:
            '${AlarmFields.title} = ? AND ${AlarmFields.hour} = ? AND ${AlarmFields.minute} = ?',
        whereArgs: [title, hour, minute],
      );
    } catch (_) {}

    final todos = await _lerDeSharedPreferences();
    todos.removeWhere(
        (a) => a.title == title && a.hour == hour && a.minute == minute);
    await _salvarEmSharedPreferences(todos);
    return 1;
  }

  Future close() async {
    final db = await instance.database;
    db.close();
  }
}
