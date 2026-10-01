import { Platform, Vibration } from 'react-native';

export function triggerCompletionVibration(): void {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(100);
    } else {
      Vibration.vibrate();
    }
  } catch {
    // 裝置或環境不支援震動時安靜忽略，不中斷流程
  }
}
