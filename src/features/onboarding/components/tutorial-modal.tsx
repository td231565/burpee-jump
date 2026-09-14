import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AppText } from '../../../components/ui/app-text';
import { Button } from '../../../components/ui/button';
import { IconButton } from '../../../components/ui/icon-button';
import { colors, radius, spacing } from '../../../theme/tokens';
import { TutorialContent } from './tutorial-content';

export interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TutorialModal({ visible, onClose }: TutorialModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal={true}
        >
          <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            <View style={styles.header}>
              <AppText variant="title" style={styles.headerTitle}>
                動作教學
              </AppText>
              <IconButton onPress={onClose} accessibilityLabel="關閉">
                <X size={24} color={colors.ink} strokeWidth={2} />
              </IconButton>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
            >
              <TutorialContent />
            </ScrollView>

            <View style={styles.footer}>
              <Button
                variant="secondary"
                onPress={onClose}
                accessibilityLabel="關閉"
              >
                關閉
              </Button>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
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
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  safeArea: {
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
