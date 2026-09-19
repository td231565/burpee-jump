import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { Button } from '../../../components/ui/button';
import { colors, radius, spacing } from '../../../theme/tokens';

export interface RescueDialogProps {
  visible: boolean;
  onConfirm: () => Promise<boolean>;
  onDecline: () => void;
}

export function RescueDialog({
  visible,
  onConfirm,
  onDecline,
}: RescueDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const success = await onConfirm();
      if (!success) {
        setErrorMessage('寫入失敗，請重試或選「否」依現有紀錄結算');
      }
    } catch {
      setErrorMessage('寫入失敗，請重試或選「否」依現有紀錄結算');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    setErrorMessage(null);
    onDecline();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // 點擊返回鍵不關閉
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <AppText variant="title" style={styles.title}>
            要不要將昨天登記為休息日呢？
          </AppText>
          <AppText variant="body" style={styles.message}>
            這將消耗 1 次休息額度，挑戰結束日保持不變。
          </AppText>

          {errorMessage && (
            <AppText variant="caption" style={styles.errorText}>
              {errorMessage}
            </AppText>
          )}

          <View style={styles.buttonContainer}>
            <Button
              variant="secondary"
              onPress={handleDecline}
              disabled={isSubmitting}
              style={styles.button}
              accessibilityLabel="否"
            >
              否
            </Button>
            <Button
              variant="primary"
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={styles.button}
              accessibilityLabel="是"
            >
              是
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
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
  errorText: {
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    minHeight: 44,
  },
});
