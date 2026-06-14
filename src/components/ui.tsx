import { Check, ChevronRight, LucideIcon, X } from 'lucide-react-native';
import { PropsWithChildren, ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, shadow, shadowLg, spacing, type } from '../theme/tokens';

// ─────────────────────────────────────────
// PressableScale
// ─────────────────────────────────────────
type PressableScaleProps = PropsWithChildren<{
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}>;

export function PressableScale({ children, onPress, style, disabled, accessibilityLabel }: PressableScaleProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [style, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

// ─────────────────────────────────────────
// Screen
// ─────────────────────────────────────────
type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}>;

export function Screen({ children, scroll = true, padded = true, keyboard = false }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, padded && styles.paddedContent]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, padded && styles.paddedContent]}>{children}</View>
  );

  const body = keyboard ? (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex}>
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return <SafeAreaView style={styles.screen}>{body}</SafeAreaView>;
}

// ─────────────────────────────────────────
// Button
// ─────────────────────────────────────────
type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  disabled?: boolean;
  compact?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}>;

export function Button({
  children,
  onPress,
  variant = 'primary',
  icon: Icon,
  trailingIcon: TrailingIcon,
  disabled,
  compact,
  loading,
  fullWidth,
}: ButtonProps) {
  const isOnDark = variant === 'primary' || variant === 'danger';
  const iconColor = isOnDark ? '#0D1117' : colors.ink;

  return (
    <PressableScale
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.compactButton,
        fullWidth && styles.fullWidthButton,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'ghost' && styles.ghostButton,
        variant === 'danger' && styles.dangerButton,
        variant === 'outline' && styles.outlineButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {Icon ? <Icon size={compact ? 15 : 17} color={iconColor} strokeWidth={2.2} /> : null}
          <Text
            style={[
              styles.buttonText,
              isOnDark && styles.buttonTextOnDark,
              compact && styles.compactButtonText,
            ]}
          >
            {children}
          </Text>
          {TrailingIcon ? <TrailingIcon size={15} color={iconColor} strokeWidth={2.2} /> : null}
          {variant === 'primary' && !TrailingIcon ? (
            <ChevronRight size={15} color={iconColor} strokeWidth={2.5} />
          ) : null}
        </>
      )}
    </PressableScale>
  );
}

// ─────────────────────────────────────────
// IconButton
// ─────────────────────────────────────────
type IconButtonProps = {
  icon: LucideIcon;
  onPress?: () => void;
  active?: boolean;
  label: string;
  size?: number;
  variant?: 'default' | 'ghost' | 'accent';
};

export function IconButton({ icon: Icon, onPress, active, label, size = 20, variant = 'default' }: IconButtonProps) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.iconButton,
        active && styles.iconButtonActive,
        variant === 'ghost' && styles.iconButtonGhost,
        variant === 'accent' && styles.iconButtonAccent,
      ]}
    >
      <Icon
        size={size}
        color={active || variant === 'accent' ? colors.background : colors.ink}
        strokeWidth={2.2}
      />
    </PressableScale>
  );
}

// ─────────────────────────────────────────
// Field (Text Input)
// ─────────────────────────────────────────
type FieldProps = TextInputProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  hint?: string;
};

export function Field({ label, style, containerStyle, hint, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.subtle}
        {...props}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────
// Pill / Chip
// ─────────────────────────────────────────
type PillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  accent?: string;
};

export function Pill({ label, selected, onPress, icon: Icon, accent = colors.emerald }: PillProps) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.pill,
        selected && { backgroundColor: `${accent}20`, borderColor: accent },
      ]}
    >
      {Icon ? <Icon size={14} color={selected ? accent : colors.muted} strokeWidth={2.2} /> : null}
      <Text style={[styles.pillText, selected && { color: accent }]}>{label}</Text>
      {selected ? <Check size={13} color={accent} strokeWidth={2.5} /> : null}
    </PressableScale>
  );
}

// ─────────────────────────────────────────
// GoalChip (large selectable chip for onboarding)
// ─────────────────────────────────────────
type GoalChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  description?: string;
};

export function GoalChip({ label, selected, onPress, icon: Icon, description }: GoalChipProps) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.goalChip, selected && styles.goalChipSelected]}
    >
      <View style={styles.goalChipLeft}>
        {Icon ? (
          <View style={[styles.goalChipIcon, selected && styles.goalChipIconSelected]}>
            <Icon size={18} color={selected ? colors.background : colors.muted} strokeWidth={2} />
          </View>
        ) : null}
        <View style={styles.goalChipText}>
          <Text style={[styles.goalChipLabel, selected && styles.goalChipLabelSelected]}>{label}</Text>
          {description ? <Text style={styles.goalChipDesc}>{description}</Text> : null}
        </View>
      </View>
      <View style={[styles.goalChipCheck, selected && styles.goalChipCheckSelected]}>
        {selected ? <Check size={13} color={colors.background} strokeWidth={2.5} /> : null}
      </View>
    </PressableScale>
  );
}

// ─────────────────────────────────────────
// ToggleRow
// ─────────────────────────────────────────
type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  accent?: string;
};

export function ToggleRow({ title, subtitle, value, onPress, icon: Icon, accent = colors.emerald }: ToggleRowProps) {
  return (
    <PressableScale onPress={onPress} style={styles.toggleRow} accessibilityLabel={title}>
      {Icon ? (
        <View style={[styles.toggleIcon, { backgroundColor: `${accent}18` }]}>
          <Icon size={17} color={accent} strokeWidth={2.2} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
      </View>
    </PressableScale>
  );
}

// ─────────────────────────────────────────
// SegmentedControl
// ─────────────────────────────────────────
type SegmentOption<T extends string> = {
  label: T;
  icon?: LucideIcon;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.label === value;
        const Icon = option.icon;
        return (
          <PressableScale
            key={option.label}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.label)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            {Icon ? <Icon size={14} color={selected ? colors.background : colors.muted} strokeWidth={2.2} /> : null}
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────
type SectionProps = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
};

export function SectionHeader({ eyebrow, title, action }: SectionProps) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

// ─────────────────────────────────────────
// MetricTile
// ─────────────────────────────────────────
type MetricTileProps = {
  label: string;
  value: string;
  detail: string;
  accent?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'flat';
  onPress?: () => void;
};

export function MetricTile({ label, value, detail, accent = colors.emerald, icon: Icon, trend, onPress }: MetricTileProps) {
  return (
    <PressableScale onPress={onPress} style={styles.metricTile} accessibilityLabel={label}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}18` }]}>
        {Icon ? <Icon size={16} color={accent} strokeWidth={2.2} /> : null}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
      {trend ? (
        <View style={[styles.metricTrend, { backgroundColor: trend === 'up' ? colors.emeraldSoft : trend === 'down' ? colors.coralSoft : colors.surface2 }]}>
          <Text style={[styles.metricTrendText, { color: trend === 'up' ? colors.emerald : trend === 'down' ? colors.coral : colors.muted }]}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

// ─────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────
type ProgressBarProps = {
  value: number;
  accent?: string;
  track?: string;
  height?: number;
};

export function ProgressBar({ value, accent = colors.emerald, track = colors.track, height = 6 }: ProgressBarProps) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: track, height }]}>
      <View
        style={[
          styles.progressFill,
          { backgroundColor: accent, width: `${Math.max(2, Math.min(value, 100))}%`, height },
        ]}
      />
    </View>
  );
}

// ─────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────
type EmptyStateProps = {
  title: string;
  body: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, body, icon: Icon, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      {Icon ? (
        <View style={styles.emptyIcon}>
          <Icon size={22} color={colors.emerald} strokeWidth={2} />
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action}
    </View>
  );
}

// ─────────────────────────────────────────
// Card (generic elevated card container)
// ─────────────────────────────────────────
type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accent?: string;
}>;

export function Card({ children, style, onPress, accent }: CardProps) {
  const inner = (
    <View style={[styles.card, accent && { borderColor: `${accent}33` }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, accent && { borderColor: `${accent}33` }, style]}>
        {children}
      </PressableScale>
    );
  }
  return inner;
}

// ─────────────────────────────────────────
// Badge
// ─────────────────────────────────────────
type BadgeProps = {
  label: string;
  color?: string;
  bg?: string;
};

export function Badge({ label, color = colors.emerald, bg }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? `${color}20` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────
// ModalSheet (bottom modal overlay)
// ─────────────────────────────────────────
type ModalSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
}>;

export function ModalSheet({ visible, onClose, title, children }: ModalSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          {title ? (
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <PressableScale onPress={onClose} style={styles.modalClose} accessibilityLabel="Close">
                <X size={18} color={colors.muted} strokeWidth={2.2} />
              </PressableScale>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────
// Divider
// ─────────────────────────────────────────
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

// ─────────────────────────────────────────
// Skeleton loading placeholder
// ─────────────────────────────────────────
export function Skeleton({ width, height, style }: { width?: number | string; height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        styles.skeleton,
        { width: width as number | undefined, height: height ?? 16 },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────
// InitialsAvatar
// ─────────────────────────────────────────
const AVATAR_PALETTE = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#3B82F6', '#22C55E', '#F97316',
];

function getAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export function InitialsAvatar({
  name,
  size = 40,
  fontSize,
  style,
}: {
  name: string;
  size?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = getAvatarBg(name || 'Friend');
  const initials = getInitials(name || 'F');
  const textSize = fontSize ?? Math.max(11, Math.round(size * 0.38));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: '#FFFFFF', fontSize: textSize, fontWeight: '700', letterSpacing: 0.5 }}>
        {initials}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
export const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Screen
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 110,
    gap: spacing.xl,
  },
  staticContent: {
    flex: 1,
    gap: spacing.xl,
  },
  paddedContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  // Pressable states
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },

  // Button
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compactButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.emerald,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0,
  },
  buttonTextOnDark: {
    color: colors.background,
  },
  compactButtonText: {
    fontSize: type.small,
  },

  // IconButton
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  iconButtonAccent: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },

  // Field
  fieldWrap: { gap: spacing.sm },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  fieldHint: {
    color: colors.muted,
    fontSize: type.micro,
    marginTop: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.semibold,
  },
  inputFocused: {
    borderColor: colors.emerald,
    backgroundColor: colors.surface2,
  },

  // Pill
  pill: {
    minHeight: 36,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },

  // GoalChip
  goalChip: {
    minHeight: 68,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  goalChipSelected: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldSoft,
  },
  goalChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  goalChipIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  goalChipIconSelected: {
    backgroundColor: colors.emerald,
  },
  goalChipText: { flex: 1 },
  goalChipLabel: {
    color: colors.inkSoft,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  goalChipLabelSelected: {
    color: colors.ink,
  },
  goalChipDesc: {
    color: colors.muted,
    fontSize: type.small,
    marginTop: 2,
  },
  goalChipCheck: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChipCheckSelected: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },

  // ToggleRow
  toggleRow: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  toggleSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 18,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTrackOn: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.muted,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
    backgroundColor: colors.background,
  },

  // Segmented
  segmented: {
    minHeight: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  segmentSelected: {
    backgroundColor: colors.emerald,
  },
  segmentText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  segmentTextSelected: {
    color: colors.background,
  },

  // SectionHeader
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.emerald,
    fontSize: type.micro,
    textTransform: 'uppercase',
    fontWeight: fontWeight.black,
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: type.section,
    fontWeight: fontWeight.black,
    letterSpacing: 0,
  },

  // MetricTile
  metricTile: {
    width: '48%',
    minHeight: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: fontWeight.black,
    letterSpacing: 0,
    marginTop: 2,
  },
  metricDetail: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 17,
  },
  metricTrend: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  metricTrendText: {
    fontSize: 10,
    fontWeight: fontWeight.extrabold,
    textTransform: 'capitalize',
  },

  // ProgressBar
  progressTrack: {
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 99,
  },

  // EmptyState
  emptyState: {
    minHeight: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: type.small,
    lineHeight: 19,
    textAlign: 'center',
  },

  // Card
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadow,
  },

  // Badge
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: type.micro,
    fontWeight: fontWeight.black,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ModalSheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    ...shadow,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.ink,
    fontSize: type.section,
    fontWeight: fontWeight.black,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Skeleton
  skeleton: {
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
});
