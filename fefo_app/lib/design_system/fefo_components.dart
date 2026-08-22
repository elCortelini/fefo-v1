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
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: text.headlineSmall),
                if (subtitle != null) ...[
                  const SizedBox(height: 6),
                  Text(subtitle!, style: text.bodyMedium),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
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
