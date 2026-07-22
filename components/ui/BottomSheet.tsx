import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enterFade, exitFade, motionDuration } from '@/constants/motion';
import { colors, iconSize, radius, shadow, spacing, typography } from '@/constants/theme';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

export interface SheetAction {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

type BottomSheetProps = {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/**
 * The one overflow-menu pattern for secondary actions (move/copy/replace/
 * remove on a meal, "Clear future planned meals", etc.) — a calm slide-up
 * sheet instead of a cramped row of equally-sized buttons. RN's Alert API is
 * a no-op on react-native-web, so this is a themed Modal instead, matching
 * the existing ConfirmDialog approach. Always shows an explicit close
 * action alongside the backdrop tap, and drives its own restrained
 * slide+fade rather than the Modal's default animation.
 */
export function BottomSheet({ visible, title, actions, onClose }: BottomSheetProps) {
  const reducedMotion = useReducedMotionPreference();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={enterFade(reducedMotion, 'fast')} exiting={exitFade(reducedMotion, 'fast')} style={styles.backdropFill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
            <Animated.View
              entering={reducedMotion ? undefined : SlideInDown.duration(motionDuration.standard)}
              exiting={reducedMotion ? undefined : SlideOutDown.duration(motionDuration.fast)}
              onStartShouldSetResponder={() => true}>
              <SafeAreaView edges={['bottom']}>
                <View style={styles.sheet}>
                  <View style={styles.handle} />
                  <View style={styles.headerRow}>
                    {title ? <Text style={styles.title}>{title}</Text> : <View />}
                    <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                      <Ionicons name="close" size={iconSize.md} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                  {actions.map((action) => (
                    <Pressable
                      key={action.key}
                      onPress={() => {
                        onClose();
                        action.onPress();
                      }}
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                      {action.icon ? (
                        <Ionicons name={action.icon} size={iconSize.md} color={action.destructive ? colors.danger : colors.textSecondary} />
                      ) : null}
                      <Text style={[styles.rowLabel, action.destructive && styles.rowLabelDestructive]}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </SafeAreaView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropFill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    ...shadow.card,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.role.label,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLabel: {
    ...typography.role.body,
    color: colors.textPrimary,
  },
  rowLabelDestructive: {
    color: colors.danger,
  },
});
