import { Modal, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { Button } from './button';
import { colors, radius, spacing } from '../../theme/tokens';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <AppText variant="title" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" style={styles.message}>
            {message}
          </AppText>

          <View style={styles.buttonContainer}>
            <Button
              variant="secondary"
              onPress={onCancel}
              style={styles.button}
              accessibilityLabel={cancelText}
            >
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onPress={onConfirm}
              style={styles.button}
              accessibilityLabel={confirmText}
            >
              {confirmText}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: spacing.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    minHeight: 44,
  },
});
