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
              fontSize: FefoTypography.pageTitleSize,
              height: 1.0,
              fontWeight: FontWeight.w500,
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
                fontSize: FefoTypography.pageSubtitleSize,
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
          fontSize: FefoTypography.sectionTitleSize,
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
        fontSize: FefoTypography.pageSubtitleSize,
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

class FefoContentCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback? onTap;
  final VoidCallback? onAction;
  final IconData actionIcon;
  final Widget? leading;
  final Widget? trailing;
  final bool selected;

  const FefoContentCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon = Icons.play_arrow_rounded,
    this.onTap,
    this.onAction,
    this.actionIcon = Icons.play_arrow_rounded,
    this.leading,
    this.trailing,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final accent = scheme.secondary;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: selected ? accent.withValues(alpha: .16) : scheme.surface.withValues(alpha: .92),
        borderRadius: FefoRadii.medium,
        border: Border.all(color: selected ? accent : scheme.onSurface.withValues(alpha: .18), width: selected ? 1.8 : 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(children: [
            leading ?? CircleAvatar(
              radius: 23,
              backgroundColor: accent.withValues(alpha: .18),
              child: Icon(icon, color: accent, size: 26),
            ),
            const SizedBox(width: 13),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontFamily: 'KGPen', fontSize: FefoTypography.contentTitleSize, height: 1.05, color: theme.textTheme.bodyLarge?.color)),
                if (subtitle != null) ...[
                  const SizedBox(height: 3),
                  Text(subtitle!, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontFamily: 'KGPen', fontSize: FefoTypography.contentSubtitleSize, height: 1.05, color: theme.textTheme.bodyMedium?.color?.withValues(alpha: .78))),
                ],
              ],
            )),
            trailing ?? IconButton.filled(
              tooltip: 'Abrir',
              onPressed: onAction ?? onTap,
              icon: Icon(actionIcon),
              style: IconButton.styleFrom(backgroundColor: accent, foregroundColor: scheme.onSecondary),
            ),
          ]),
        ),
      ),
    );
  }
}
