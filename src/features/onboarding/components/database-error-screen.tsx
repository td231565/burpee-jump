import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../components/ui/app-text';
import { NatureBackdrop } from '../../../components/ui/nature-backdrop';
import { colors, spacing } from '../../../theme/tokens';

export function DatabaseErrorScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.container}>
        <View style={styles.card}>
          <AppText variant="title" style={styles.errorText}>
            資料載入失敗，請重新開啟 App
          </AppText>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  errorText: {
    color: colors.ink,
    textAlign: 'center',
  },
});
