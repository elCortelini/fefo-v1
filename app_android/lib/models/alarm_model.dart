// lib/models/alarm_model.dart

const String tableAlarms = 'alarms';

class AlarmFields {
  static final List<String> values = [
    id,
    title,
    hour,
    minute,
    isActive,
    audioPath,
    daysOfWeek
  ];

  static const String id = '_id';
  static const String title = 'title';
  static const String hour = 'hour';
  static const String minute = 'minute';
  static const String isActive = 'isActive';
  static const String audioPath = 'audioPath';
  static const String daysOfWeek =
      'daysOfWeek'; // Armazenado como string "1,2,3" (1=Seg, 7=Dom)
}

class AlarmModel {
  final int? id;
  final String title;
  final int hour;
  final int minute;
  bool isActive;
  final String audioPath;
  final List<int> daysOfWeek; // Lista de inteiros de 1 a 7

  AlarmModel({
    this.id,
    required this.title,
    required this.hour,
    required this.minute,
    required this.isActive,
    required this.audioPath,
    this.daysOfWeek = const [],
  });

  AlarmModel copyWith({
    int? id,
    String? title,
    int? hour,
    int? minute,
    bool? isActive,
    String? audioPath,
    List<int>? daysOfWeek,
  }) =>
      AlarmModel(
        id: id ?? this.id,
        title: title ?? this.title,
        hour: hour ?? this.hour,
        minute: minute ?? this.minute,
        isActive: isActive ?? this.isActive,
        audioPath: audioPath ?? this.audioPath,
        daysOfWeek: daysOfWeek ?? this.daysOfWeek,
      );

  static AlarmModel fromJson(Map<String, Object?> json) => AlarmModel(
        id: (json[AlarmFields.id] ?? json['id'] ?? json['id_alarm']) as int?,
        title: json[AlarmFields.title] as String,
        hour: json[AlarmFields.hour] as int,
        minute: json[AlarmFields.minute] as int,
        isActive: json[AlarmFields.isActive] == 1,
        audioPath: json[AlarmFields.audioPath] as String,
        // Converte string "1,2,3" de volta para List<int>
        daysOfWeek: (json[AlarmFields.daysOfWeek] as String?)
                ?.split(',')
                .where((s) => s.isNotEmpty)
                .map(int.parse)
                .toList() ??
            [],
      );

  Map<String, Object?> toJson() => {
        AlarmFields.id: id,
        AlarmFields.title: title,
        AlarmFields.hour: hour,
        AlarmFields.minute: minute,
        AlarmFields.isActive: isActive ? 1 : 0,
        AlarmFields.audioPath: audioPath,
        // Salva List<int> como string "1,2,3"
        AlarmFields.daysOfWeek: daysOfWeek.join(','),
      };
}
