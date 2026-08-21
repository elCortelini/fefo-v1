import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum FefoThemeId { classico, aurora, oceano, floresta, porDoSol, neve }

class FefoThemeDefinition {
  final FefoThemeId id;
  final String nome;
  final String descricao;
  final Color accent;
  final Color accentSecondary;
  final Color background;
  final Color backgroundSecondary;
  final Color surface;
  final Color text;
  final Color mutedText;
  final bool useLegacyImage;

  const FefoThemeDefinition({
    required this.id,
    required this.nome,
    required this.descricao,
    required this.accent,
    required this.accentSecondary,
    required this.background,
    required this.backgroundSecondary,
    required this.surface,
    required this.text,
    required this.mutedText,
    this.useLegacyImage = false,
  });
}

const fefoThemes = <FefoThemeDefinition>[
  FefoThemeDefinition(
    id: FefoThemeId.classico,
    nome: 'Clássico FEFO',
    descricao: 'Tema original com a imagem de fundo atual.',
    accent: Color(0xFFDC4900),
    accentSecondary: Color(0xFF318134),
    background: Color(0xFFFFF4DF),
    backgroundSecondary: Color(0xFFFFE7C2),
    surface: Color(0xF2FFFFFF),
    text: Color(0xFF17212B),
    mutedText: Color(0xFF4B5563),
    useLegacyImage: true,
  ),
  FefoThemeDefinition(
    id: FefoThemeId.aurora,
    nome: 'Aurora calma',
    descricao: 'Gradientes suaves e acolhedores para o uso diário.',
    accent: Color(0xFFB8A1FF),
    accentSecondary: Color(0xFF73D9D2),
    background: Color(0xFF0C1018),
    backgroundSecondary: Color(0xFF2C2447),
    surface: Color(0xCC272844),
    text: Color(0xFFF8FAFC),
    mutedText: Color(0xFFA9AEC4),
  ),
  FefoThemeDefinition(
    id: FefoThemeId.oceano,
    nome: 'Oceano suave',
    descricao: 'Azul e teal para relaxamento e momentos de ninar.',
    accent: Color(0xFF63D8DF),
    accentSecondary: Color(0xFF63A8FF),
    background: Color(0xFF08151F),
    backgroundSecondary: Color(0xFF17475B),
    surface: Color(0xC20B384B),
    text: Color(0xFFF3FBFF),
    mutedText: Color(0xFF9BBDCC),
  ),
  FefoThemeDefinition(
    id: FefoThemeId.floresta,
    nome: 'Floresta leve',
    descricao: 'Verde natural para conteúdos pedagógicos e rotina.',
    accent: Color(0xFF9BE3AC),
    accentSecondary: Color(0xFFD7DB82),
    background: Color(0xFF0C1C1D),
    backgroundSecondary: Color(0xFF2B503B),
    surface: Color(0xC2194031),
    text: Color(0xFFF4FFF5),
    mutedText: Color(0xFFA6C4B5),
  ),
  FefoThemeDefinition(
    id: FefoThemeId.porDoSol,
    nome: 'Pôr do sol',
    descricao: 'Rosa e laranja suaves com uma identidade mais afetiva.',
    accent: Color(0xFFFFB57E),
    accentSecondary: Color(0xFFF68BB4),
    background: Color(0xFF171527),
    backgroundSecondary: Color(0xFF633B56),
    surface: Color(0xC24C2A41),
    text: Color(0xFFFFF7F5),
    mutedText: Color(0xFFD0AFAE),
  ),
  FefoThemeDefinition(
    id: FefoThemeId.neve,
    nome: 'Neve serena',
    descricao: 'Azul profundo, limpo e tecnológico, com pouca saturação.',
    accent: Color(0xFFB9E3FF),
    accentSecondary: Color(0xFFC7C5FF),
    background: Color(0xFF101A2A),
    backgroundSecondary: Color(0xFF425E7D),
    surface: Color(0xC22D4260),
    text: Color(0xFFF5FAFF),
    mutedText: Color(0xFFB4C4D7),
  ),
];

class FefoThemeController extends ChangeNotifier {
  static const _key = 'fefo_theme_id';
  FefoThemeId _themeId = FefoThemeId.classico;
  bool _loaded = false;

  FefoThemeId get themeId => _themeId;
  FefoThemeDefinition get current => fefoThemes.firstWhere((theme) => theme.id == _themeId);
  bool get loaded => _loaded;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    _themeId = FefoThemeId.values.firstWhere(
      (id) => id.name == saved,
      orElse: () => FefoThemeId.classico,
    );
    _loaded = true;
    notifyListeners();
  }

  Future<void> setTheme(FefoThemeId id) async {
    if (_themeId == id) return;
    _themeId = id;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, id.name);
  }
}
