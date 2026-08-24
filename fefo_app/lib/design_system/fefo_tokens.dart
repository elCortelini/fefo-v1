import 'package:flutter/material.dart';

/// Tokens visuais do FEFO. As telas devem consumir estes valores, nunca cores
/// ou espaçamentos arbitrários diretamente.
class FefoTokens extends ThemeExtension<FefoTokens> {
  final Color success;
  final Color warning;
  final Color danger;
  final Color info;
  final Color outline;
  final double pagePadding;
  final double contentMaxWidth;
  final double controlHeight;

  const FefoTokens({
    required this.success,
    required this.warning,
    required this.danger,
    required this.info,
    required this.outline,
    this.pagePadding = 20,
    this.contentMaxWidth = 720,
    this.controlHeight = 52,
  });

  static const spacing = <double>[0, 4, 8, 12, 16, 20, 24, 32, 40, 48];

  @override
  FefoTokens copyWith({
    Color? success,
    Color? warning,
    Color? danger,
    Color? info,
    Color? outline,
    double? pagePadding,
    double? contentMaxWidth,
    double? controlHeight,
  }) =>
      FefoTokens(
        success: success ?? this.success,
        warning: warning ?? this.warning,
        danger: danger ?? this.danger,
        info: info ?? this.info,
        outline: outline ?? this.outline,
        pagePadding: pagePadding ?? this.pagePadding,
        contentMaxWidth: contentMaxWidth ?? this.contentMaxWidth,
        controlHeight: controlHeight ?? this.controlHeight,
      );

  @override
  FefoTokens lerp(covariant FefoTokens? other, double t) {
    if (other == null) return this;
    return FefoTokens(
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      info: Color.lerp(info, other.info, t)!,
      outline: Color.lerp(outline, other.outline, t)!,
      pagePadding: pagePadding,
      contentMaxWidth: contentMaxWidth,
      controlHeight: controlHeight,
    );
  }
}

class FefoSpacing {
  static const page = EdgeInsets.symmetric(horizontal: 20, vertical: 16);
  static const section = EdgeInsets.only(top: 24, bottom: 12);
  static const card = EdgeInsets.all(16);
  static const compact = EdgeInsets.all(12);
}

/// Regra única de hierarquia textual do aplicativo.
/// Toda tela deve usar estes estilos ou os componentes do design system.
class FefoTypography {
  static const pageTitleSize = 52.0;
  static const pageSubtitleSize = 22.0;
  static const sectionTitleSize = 26.0;
  static const contentTitleSize = 25.0;
  static const contentSubtitleSize = 17.0;

  static TextStyle pageTitle(BuildContext context) => TextStyle(
        fontFamily: 'Billotilde',
        fontSize: pageTitleSize,
        height: 1,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).colorScheme.secondary,
      );

  static TextStyle pageSubtitle(BuildContext context) => TextStyle(
        fontFamily: 'Billotilde',
        fontSize: pageSubtitleSize,
        height: 1.1,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).colorScheme.secondary,
      );

  static TextStyle body(BuildContext context) => TextStyle(
        fontFamily: 'KGPen',
        fontSize: 18,
        height: 1.2,
        color: Theme.of(context).colorScheme.onSurface,
      );
}

class FefoRadii {
  static const small = BorderRadius.all(Radius.circular(12));
  static const medium = BorderRadius.all(Radius.circular(18));
  static const large = BorderRadius.all(Radius.circular(24));
  static const pill = BorderRadius.all(Radius.circular(999));
}
