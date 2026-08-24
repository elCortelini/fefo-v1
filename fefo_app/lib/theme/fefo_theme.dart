import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../design_system/fefo_tokens.dart';

enum FefoThemeId {
  classico,
  aurora,
  oceano,
  floresta,
  porDoSol,
  neve,
  lavandaClara,
  mentaClara
}

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
  final bool isDark;

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
    this.isDark = true,
  });

  ThemeData toThemeData() {
    final scheme = ColorScheme.fromSeed(
      seedColor: accent,
      brightness: isDark ? Brightness.dark : Brightness.light,
      surface: surface,
    );
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      brightness: scheme.brightness,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      fontFamily: 'KGPen',
    );
    final onAccent = scheme.onPrimary;
    return base.copyWith(
      textTheme:
          base.textTheme.apply(bodyColor: text, displayColor: text).copyWith(
                headlineLarge: base.textTheme.headlineLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
                headlineMedium: base.textTheme.headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
                headlineSmall: base.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
                titleLarge: base.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700),
                bodyLarge: base.textTheme.bodyLarge?.copyWith(
                    fontFamily: 'KGPen', color: text, fontSize: 18),
                bodyMedium: base.textTheme.bodyMedium?.copyWith(
                    fontFamily: 'KGPen', color: mutedText, fontSize: 17),
              ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: isDark ? 1 : 0,
        margin: const EdgeInsets.symmetric(vertical: 6),
        shape: const RoundedRectangleBorder(borderRadius: FefoRadii.medium),
      ),
      listTileTheme: ListTileThemeData(
        textColor: text,
        iconColor: accentSecondary,
        subtitleTextStyle: TextStyle(color: mutedText),
        shape: const RoundedRectangleBorder(borderRadius: FefoRadii.medium),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: text,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: base.textTheme.titleLarge
            ?.copyWith(color: text, fontWeight: FontWeight.w800),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        shape: const RoundedRectangleBorder(borderRadius: FefoRadii.large),
        titleTextStyle:
            TextStyle(color: text, fontSize: 22, fontWeight: FontWeight.w800),
        contentTextStyle: TextStyle(color: mutedText, fontSize: 16),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark
            ? Colors.white.withValues(alpha: .06)
            : Colors.black.withValues(alpha: .03),
        labelStyle: TextStyle(color: mutedText),
        hintStyle: TextStyle(color: mutedText),
        border: const OutlineInputBorder(
            borderRadius: FefoRadii.small, borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
            borderRadius: FefoRadii.small,
            borderSide: BorderSide(color: accent.withValues(alpha: .18))),
        focusedBorder: OutlineInputBorder(
            borderRadius: FefoRadii.small,
            borderSide: BorderSide(color: accent, width: 2)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        elevation: 8,
        height: 72,
        indicatorColor: accent.withValues(alpha: .18),
        labelTextStyle: WidgetStatePropertyAll(
            TextStyle(color: text, fontWeight: FontWeight.w600)),
        iconTheme: WidgetStatePropertyAll(IconThemeData(color: accent)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(0, 52),
          backgroundColor: accent,
          foregroundColor: onAccent,
          shape: const RoundedRectangleBorder(borderRadius: FefoRadii.pill),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, 52),
          backgroundColor: accent,
          foregroundColor: onAccent,
          shape: const RoundedRectangleBorder(borderRadius: FefoRadii.pill),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 52),
          shape: const RoundedRectangleBorder(borderRadius: FefoRadii.pill),
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: accent,
        thumbColor: accent,
        inactiveTrackColor: accent.withValues(alpha: .25),
      ),
      extensions: [
        FefoTokens(
          success: const Color(0xFF2E8B65),
          warning: const Color(0xFFC47A1B),
          danger: const Color(0xFFC94D5B),
          info: const Color(0xFF4D83C4),
          outline: accent.withValues(alpha: .22),
        ),
      ],
    );
  }
}

const fefoThemes = <FefoThemeDefinition>[
  FefoThemeDefinition(
    id: FefoThemeId.classico,
    nome: 'Clássico FEFO',
    descricao: 'Identidade original do FEFO, com leitura mais limpa.',
    accent: Color(0xFFDC4900),
    accentSecondary: Color(0xFF318134),
    background: Color(0xFFFFF4DF),
    backgroundSecondary: Color(0xFFFFE7C2),
    surface: Color(0xF2FFFFFF),
    text: Color(0xFF17212B),
    mutedText: Color(0xFF4B5563),
    useLegacyImage: false,
    isDark: false,
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
  FefoThemeDefinition(
    id: FefoThemeId.lavandaClara,
    nome: 'Lavanda clara',
    descricao: 'Tema claro, delicado e acolhedor para leitura confortável.',
    accent: Color(0xFF7657C5),
    accentSecondary: Color(0xFF3D8F91),
    background: Color(0xFFF7F5FF),
    backgroundSecondary: Color(0xFFDCD6FF),
    surface: Color(0xEFFFFFFF),
    text: Color(0xFF25233A),
    mutedText: Color(0xFF5E6072),
    isDark: false,
  ),
  FefoThemeDefinition(
    id: FefoThemeId.mentaClara,
    nome: 'Menta clara',
    descricao: 'Tema claro com verde-água suave e alto conforto visual.',
    accent: Color(0xFF197C74),
    accentSecondary: Color(0xFF3B8F59),
    background: Color(0xFFF2FBF7),
    backgroundSecondary: Color(0xFFCBEEDF),
    surface: Color(0xEFFFFFFF),
    text: Color(0xFF1D302B),
    mutedText: Color(0xFF5A6E68),
    isDark: false,
  ),
];

class FefoThemeController extends ChangeNotifier {
  static const _key = 'fefo_theme_id';
  FefoThemeId _themeId = FefoThemeId.classico;
  bool _loaded = false;

  FefoThemeId get themeId => _themeId;
  FefoThemeDefinition get current =>
      fefoThemes.firstWhere((theme) => theme.id == _themeId);
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
