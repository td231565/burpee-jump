import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { colors, radius, spacing } from '../../../theme/tokens';

export function TutorialContent() {
  return (
    <View style={styles.container}>
      {/* TODO(video-license): 取得並保存指定影片的嵌入同意與來源紀錄後，才可啟用正式播放器。 */}
      <View style={styles.videoPlaceholder}>
        <AppText variant="body" style={styles.videoPlaceholderText}>
          教學影片準備中
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          每天兩分鐘，走完今天這一小段
        </AppText>
        <AppText variant="body" style={styles.bodyText}>
          BurpeeJump 用清楚的訓練與休息提示，陪你完成一段短而專注的波比跳。你決定速度與強度，App 幫你掌握節奏，記住每一次完成。
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          先熟悉動作，再開始計時
        </AppText>
        <AppText variant="body" style={styles.bodyText}>
          波比跳依序包含下蹲、雙手撐地、雙腿向後伸展、回到深蹲，再起身跳躍。保持自己的節奏，不需要為了追上倒數而勉強加快。
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          先求穩定，再求速度
        </AppText>
        <AppText variant="body" style={styles.bodyText}>
          雙手撐地進入棒式時，讓手腕大致位於肩膀下方，身體從肩膀到腳跟保持穩定，避免腰臀明顯下沉或抬高。雙腳回到深蹲時先踩穩地面；若動作開始失去控制，就放慢或停止，不要為了追上倒數勉強完成。
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          保持呼吸，不要憋氣
        </AppText>
        <AppText variant="body" style={styles.bodyText}>
          用力起身或跳起時呼氣，回到下蹲或較低位置時吸氣。動作加快後不必勉強讓每次呼吸完全對上每一步，但請持續呼吸；若已無法控制呼吸或感到不適，請放慢或停止。
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          輕柔落地，先站穩再繼續
        </AppText>
        <AppText variant="body" style={styles.bodyText}>
          跳起後盡量輕柔落地，讓雙腳穩定接觸地面，髖部與膝蓋自然彎曲來緩衝，膝蓋朝腳尖方向。避免膝蓋向內塌陷；尚未站穩前，不要急著進入下一次動作。
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="title" style={styles.sectionTitle}>
          先確認今天適合運動
        </AppText>
        <AppText variant="body" style={styles.bodyText}>
          請在穩固、防滑且空間足夠的位置進行。若出現胸痛、暈眩、呼吸異常或明顯疼痛，請立即停止；有健康疑慮時，請先諮詢合格的醫療或運動專業人員。
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  videoPlaceholderText: {
    color: colors.muted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.ink,
    marginBottom: spacing.xs,
    fontSize: 18,
    lineHeight: 24,
  },
  bodyText: {
    color: colors.ink,
    lineHeight: 24,
  },
});
