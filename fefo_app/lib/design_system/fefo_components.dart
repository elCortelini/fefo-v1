import 'package:flutter/material.dart';

import 'fefo_tokens.dart';

class FefoPageHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;

  const FefoPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = theme.textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            softWrap: true,
            style: text.headlineSmall?.copyWith(
              fontFamily: 'Billotilde',
              fontSize: 52,
              height: 1.0,
              color: theme.colorScheme.secondary,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              softWrap: true,
              style: text.bodyLarge?.copyWith(
                fontFamily: 'Billotilde',
                color: theme.colorScheme.secondary,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          if (trailing != null) ...[
            const SizedBox(height: 8),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class FefoCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  const FefoCard({super.key, required this.child, this.padding, this.onTap});

  @override
  Widget build(BuildContext context) {
    final card = Card(
      child: Padding(padding: padding ?? FefoSpacing.card, child: child),
    );
    return onTap == null
        ? card
        : InkWell(
            onTap: onTap,
            borderRadius: FefoRadii.medium,
            child: card,
          );
  }
}

class FefoSectionHeader extends StatelessWidget {
  final String title;

  const FefoSectionHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 10),
      child: Text(
        title,
        textAlign: TextAlign.center,
        softWrap: true,
        style: TextStyle(
          fontFamily: 'Billotilde',
          fontSize: 26,
          fontWeight: FontWeight.w700,
          color: scheme.secondary,
        ),
      ),
    );
  }
}

class FefoPageSubtitle extends StatelessWidget {
  final String text;

  const FefoPageSubtitle({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: TextAlign.center,
      softWrap: true,
      style: TextStyle(
        fontFamily: 'Billotilde',
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).colorScheme.secondary,
      ),
    );
  }
}

class FefoStatusBadge extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color? color;

  const FefoStatusBadge({
    super.key,
    required this.label,
    required this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final tint = color ?? Theme.of(context).colorScheme.primary;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: tint.withValues(alpha: .12),
        borderRadius: FefoRadii.pill,
        border: Border.all(color: tint.withValues(alpha: .35)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: tint),
            const SizedBox(width: 8),
            Text(label,
                style: TextStyle(color: tint, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}
