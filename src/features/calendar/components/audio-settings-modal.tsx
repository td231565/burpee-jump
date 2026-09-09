import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { IconButton } from '../../../components/ui/icon-button';
import { colors, radius, spacing } from '../../../theme/tokens';
import type { AudioPreferences } from '../../../data/audio-preferences';

export interface AudioSettingsModalProps {
  visible: boolean;
  preferences: AudioPreferences;
  onUpdatePreferences: (preferences: AudioPreferences) => void;
  onClose: () => void;
}

export function AudioSettingsModal({
  visible,
  preferences,
  onUpdatePreferences,
  onClose,
}: AudioSettingsModalProps) {
  const handleToggleVoice = (value: boolean) => {
    onUpdatePreferences({ ...preferences, voice_enabled: value });
  };

  const handleToggleCues = (value: boolean) => {
    onUpdatePreferences({ ...preferences, cues_enabled: value });
  };

  const handleToggleMusic = (value: boolean) => {
    onUpdatePreferences({ ...preferences, music_enabled: value });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <AppText variant="title" style={styles.title}>
              音訊設定
            </AppText>
            <IconButton
              onPress={onClose}
              accessibilityLabel="關閉音訊設定"
            >
              ✕
            </IconButton>
          </View>

          <View style={styles.row}>
            <AppText variant="body" style={styles.label}>
              導引語音
            </AppText>
            <Switch
              value={preferences.voice_enabled}
              onValueChange={handleToggleVoice}
              accessibilityLabel="導引語音"
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.row}>
            <AppText variant="body" style={styles.label}>
              提示音效
            </AppText>
            <Switch
              value={preferences.cues_enabled}
              onValueChange={handleToggleCues}
              accessibilityLabel="提示音效"
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.row, styles.lastRow]}>
            <AppText variant="body" style={styles.label}>
              背景音樂
            </AppText>
            <Switch
              value={preferences.music_enabled}
              onValueChange={handleToggleMusic}
              accessibilityLabel="背景音樂"
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
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
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 48,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    color: colors.ink,
  },
});
