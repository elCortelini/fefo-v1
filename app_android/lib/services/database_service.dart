// lib/services/database_service.dart

import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/alarm_model.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

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

  Future<AlarmModel> create(AlarmModel alarm) async {
    final db = await instance.database;
    final id = await db.insert(tableAlarms, alarm.toJson());
    return alarm.copyWith(id: id);
  }

  Future<AlarmModel> read(int id) async {
    final db = await instance.database;
    final maps = await db.query(
      tableAlarms,
      columns: AlarmFields.values,
      where: '${AlarmFields.id} = ?',
      whereArgs: [id],
    );

    if (maps.isNotEmpty) {
      return AlarmModel.fromJson(maps.first);
    } else {
      throw Exception('ID $id not found');
    }
  }

  Future<List<AlarmModel>> readAll() async {
    final db = await instance.database;
    const orderBy = '${AlarmFields.hour}, ${AlarmFields.minute} ASC';
    final result = await db.query(tableAlarms, orderBy: orderBy);

    return result.map((json) => AlarmModel.fromJson(json)).toList();
  }

  Future<int> update(AlarmModel alarm) async {
    final db = await instance.database;
    return db.update(
      tableAlarms,
      alarm.toJson(),
      where: '${AlarmFields.id} = ?',
      whereArgs: [alarm.id],
    );
  }

  Future<int> delete(int id) async {
    final db = await instance.database;
    return await db.delete(
      tableAlarms,
      where: '${AlarmFields.id} = ?',
      whereArgs: [id],
    );
  }

  Future close() async {
    final db = await instance.database;
    db.close();
  }
}
