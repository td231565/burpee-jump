import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { AppText } from '../../../components/ui/app-text';
import { IconButton } from '../../../components/ui/icon-button';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { AudioPreferences } from '../../../data/audio-preferences';
import type { UserProfile } from '../../../data/profile';

export interface SettingsModalProps {
  visible: boolean;
  preferences: AudioPreferences;
  onUpdatePreferences: (preferences: AudioPreferences) => void;
  onLoadProfile: () => Promise<UserProfile>;
  onUpdateNickname: (nickname: string | null) => Promise<void>;
  onClose: () => void;
  initialNickname?: string | null;
}

export function SettingsModal({
  visible,
  preferences,
  onUpdatePreferences,
  onLoadProfile,
  onUpdateNickname,
  onClose,
  initialNickname = null,
}: SettingsModalProps) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [isLoadingProfile, setIsLoadingProfile] = useState(visible);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setIsLoadingProfile(true);
      setLoadError(null);
    }
  }

  // 持久值：undefined 代表從未成功讀取過；string | null 代表已確認的持久值
  const [persistedNickname, setPersistedNickname] = useState<string | null | undefined>(
    initialNickname !== undefined ? initialNickname : undefined
  );
  const [nicknameDraft, setNicknameDraft] = useState(initialNickname ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setNicknameDraft(persistedNickname ?? '');
    setSaveError(null);
    setSaveSuccess(null);
    setLoadError(null);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    onClose();
  };

  // 每次開啟 modal 時重新讀取個人資料
  useEffect(() => {
    if (!visible) return;

    let isCurrent = true;

    onLoadProfile()
      .then((profile) => {
        if (!isCurrent || !isMountedRef.current) return;
        setPersistedNickname(profile.nickname);
        setNicknameDraft(profile.nickname ?? '');
      })
      .catch(() => {
        if (!isCurrent || !isMountedRef.current) return;
        setLoadError('個人資料讀取失敗');

        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setLoadError(null);
          }
        }, 4000);
      })
      .finally(() => {
        if (isCurrent && isMountedRef.current) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [visible, onLoadProfile]);

  const handleDraftChange = (text: string) => {
    setNicknameDraft(text);
    if (saveError) setSaveError(null);
    if (saveSuccess) setSaveSuccess(null);
  };

  const trimmed = nicknameDraft.trim();
  const normalizedDraft = trimmed.length > 0 ? trimmed : null;

  // 只有正規化後內容與目前保存值不同時啟用更新
  const isModified =
    persistedNickname !== undefined
      ? normalizedDraft !== persistedNickname
      : normalizedDraft !== null; // 未知持久值時，只有輸入非空字串才可嘗試保存

  const handleSaveNickname = async () => {
    if (!isModified || isSavingNickname) return;
    setIsSavingNickname(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await onUpdateNickname(normalizedDraft);
      setPersistedNickname(normalizedDraft);
      setSaveSuccess('暱稱已更新');
    } catch {
      setSaveError('暱稱未能儲存，請再試一次');
    } finally {
      setIsSavingNickname(false);
    }
  };

  // Phase 3: 「提示語音」Switch，一次切換同步保存 voice_enabled、cues_enabled 為相同值
  const handleTogglePrompts = (value: boolean) => {
    onUpdatePreferences({
      ...preferences,
      voice_enabled: value,
      cues_enabled: value,
    });
  };

  const handleToggleMusic = (value: boolean) => {
    onUpdatePreferences({ ...preferences, music_enabled: value });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal={true}
        >
          <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            {/* 固定標題與關閉按鈕 */}
            <View style={styles.header}>
              <AppText variant="title" style={styles.title}>
                設定
              </AppText>
              <IconButton onPress={handleClose} accessibilityLabel="關閉設定">
                <X size={24} color={colors.ink} strokeWidth={2} />
              </IconButton>
            </View>

            {/* 短暫讀取失敗 Toast / Banner */}
            {loadError && (
              <View
                style={styles.bannerContainer}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                <AppText variant="caption" style={styles.bannerText}>
                  {loadError}
                </AppText>
              </View>
            )}

            <View style={styles.bodyWrapper}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flexOne}
              >
                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* 個人資料區域 */}
                  <View style={styles.section}>
                    <AppText variant="title" style={styles.sectionHeader}>
                      個人資料
                    </AppText>

                    <View style={styles.inputGroup}>
                      <AppText variant="caption" style={styles.label}>
                        暱稱（選填）
                      </AppText>
                      <View style={styles.inputRow}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="輸入暱稱"
                          placeholderTextColor={colors.muted}
                          value={nicknameDraft}
                          onChangeText={handleDraftChange}
                          maxLength={20}
                          autoCapitalize="none"
                          autoCorrect={false}
                          accessibilityLabel="暱稱（選填）"
                        />
                        <IconButton
                          onPress={handleSaveNickname}
                          disabled={!isModified || isSavingNickname}
                          accessibilityLabel="更新暱稱"
                        >
                          <Check
                            size={20}
                            color={!isModified || isSavingNickname ? colors.muted : colors.primary}
                            strokeWidth={2.5}
                          />
                        </IconButton>
                      </View>
                      <AppText variant="caption" style={styles.helperText}>
                        最多 20 個字元
                      </AppText>

                      {saveError && (
                        <AppText
                          variant="caption"
                          style={styles.errorText}
                          accessibilityRole="alert"
                        >
                          {saveError}
                        </AppText>
                      )}

                      {saveSuccess && (
                        <AppText
                          variant="caption"
                          style={styles.successText}
                          accessibilityLiveRegion="polite"
                        >
                          {saveSuccess}
                        </AppText>
                      )}
                    </View>
                  </View>

                  {/* 音訊區域 */}
                  <View style={styles.section}>
                    <AppText variant="title" style={styles.sectionHeader}>
                      音訊
                    </AppText>

                    <View style={styles.row}>
                      <AppText variant="body" style={styles.rowLabel}>
                        提示語音
                      </AppText>
                      <Switch
                        value={preferences.voice_enabled}
                        onValueChange={handleTogglePrompts}
                        accessibilityLabel="提示語音"
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>

                    <View style={[styles.row, styles.lastRow]}>
                      <AppText variant="body" style={styles.rowLabel}>
                        背景音樂
                      </AppText>
                      <Switch
                        value={preferences.music_enabled}
                        onValueChange={handleToggleMusic}
                        accessibilityLabel="背景音樂"
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>

              {/* 讀取中半透明覆蓋層與 Spinner */}
              {isLoadingProfile && (
                <View
                  style={styles.loadingOverlay}
                  pointerEvents="none"
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden={true}
                >
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    accessibilityLabel="正在讀取個人資料"
                  />
                </View>
              )}
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
    maxWidth: 380,
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  bannerContainer: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  bannerText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  bodyWrapper: {
    position: 'relative',
    flexShrink: 1,
  },
  flexOne: {
    flexShrink: 1,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.base,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md, // Phase 3: 增加 spacing.xs (8 + 4 = 12)
  },
  inputGroup: {
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm, // Phase 3: 增加 spacing.xs (4 + 4 = 8)
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.ink,
    minHeight: 44,
  },
  helperText: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
  },
  successText: {
    color: colors.success,
    marginTop: spacing.xs,
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
  rowLabel: {
    fontSize: 16,
    color: colors.ink,
    flex: 1,
    paddingRight: spacing.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
