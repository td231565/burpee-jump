import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AppText } from '../../../components/ui/app-text';
import { Button } from '../../../components/ui/button';
import { IconButton } from '../../../components/ui/icon-button';
import { NatureBackdrop } from '../../../components/ui/nature-backdrop';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { TutorialContent } from './tutorial-content';

export interface OnboardingScreenProps {
  initialNickname: string | null;
  onSaveNickname: (nickname: string | null) => Promise<void>;
  onMountStep?: () => void;
  onComplete: (nickname: string | null) => void;
  onDismiss: () => void;
}

export function OnboardingScreen({
  initialNickname,
  onSaveNickname,
  onMountStep,
  onComplete,
  onDismiss,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<'nickname' | 'tutorial'>('nickname');
  const [nicknameDraft, setNicknameDraft] = useState(initialNickname ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSavedNickname, setCurrentSavedNickname] = useState<string | null>(initialNickname);

  useEffect(() => {
    onMountStep?.();
  }, [onMountStep]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [onDismiss]);

  const handleContinue = async () => {
    const trimmed = nicknameDraft.trim();
    const normalizedDraft = trimmed.length > 0 ? trimmed : null;
    const previousSaved = currentSavedNickname;

    // 若未修改過且與原本保存值一致，直接進入教學
    if (normalizedDraft === previousSaved) {
      setStep('tutorial');
      return;
    }

    // 若原本為 null 且輸入為空，不呼叫儲存直接進教學
    if (previousSaved === null && normalizedDraft === null) {
      setStep('tutorial');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSaveNickname(normalizedDraft);
      setCurrentSavedNickname(normalizedDraft);
      setStep('tutorial');
    } catch {
      setErrorMessage('暱稱未能儲存，請再試一次');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishTutorial = () => {
    onComplete(currentSavedNickname);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRight}>
            <IconButton onPress={onDismiss} accessibilityLabel="關閉">
              <X size={24} color={colors.ink} strokeWidth={2} />
            </IconButton>
          </View>
        </View>

        {step === 'nickname' ? (
          <KeyboardAvoidingView
            style={styles.flexOne}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.stepContainer}>
                <AppText variant="title" style={styles.title}>
                  想怎麼稱呼你？
                </AppText>
                <AppText variant="body" style={styles.subtitle}>
                  之後會用這個名字在首頁和你打招呼。
                </AppText>

                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.label}>
                    暱稱（選填）
                  </AppText>
                  <TextInput
                    style={styles.textInput}
                    placeholder="輸入暱稱"
                    placeholderTextColor={colors.muted}
                    value={nicknameDraft}
                    onChangeText={(text) => {
                      setNicknameDraft(text);
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="暱稱（選填）"
                  />
                  <AppText variant="caption" style={styles.helperText}>
                    最多 20 個字元
                  </AppText>
                  {errorMessage && (
                    <AppText
                      variant="caption"
                      style={styles.errorText}
                      accessibilityRole="alert"
                    >
                      {errorMessage}
                    </AppText>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Button
                variant="primary"
                onPress={handleContinue}
                disabled={isSaving}
                accessibilityLabel="繼續"
              >
                繼續
              </Button>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.flexOne}>
            <ScrollView
              style={styles.flexOne}
              contentContainerStyle={styles.scrollContent}
            >
              <TutorialContent />
            </ScrollView>
            <View style={styles.footer}>
              <Button
                variant="primary"
                onPress={handleFinishTutorial}
                accessibilityLabel="我知道了"
              >
                我知道了
              </Button>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: spacing.base,
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerRight: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  stepContainer: {
    paddingTop: spacing.base,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.ink,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.ink,
    minHeight: 48,
  },
  helperText: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.base,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
});
