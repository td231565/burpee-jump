import {
  deriveTabataSnapshot,
  getTabataEvents,
  TABATA_STAGES,
  TOTAL_WORKOUT_DURATION_MS,
  PREPARE_DURATION_MS,
} from '../src/features/workout/tabata';

describe('Tabata Timing Derivation (Seam 2)', () => {
  it('固定為 7 個正式階段，總時長 110 秒，最後一組後不休息', () => {
    expect(TABATA_STAGES).toHaveLength(7);
    expect(TOTAL_WORKOUT_DURATION_MS).toBe(110_000);
    expect(PREPARE_DURATION_MS).toBe(3_000);

    const totalSeconds = TABATA_STAGES.reduce((acc, s) => acc + s.durationSeconds, 0);
    expect(totalSeconds).toBe(110);
    expect(TABATA_STAGES[6]).toEqual({
      type: 'work',
      round: 4,
      durationSeconds: 20,
    });
  });

  it('準備倒數 3 秒期間不消耗 110 秒正式訓練時間', () => {
    const snapshotAt0 = deriveTabataSnapshot(0);
    expect(snapshotAt0.phase).toBe('preparing');
    expect(snapshotAt0.remainingSeconds).toBe(3);
    expect(snapshotAt0.elapsedWorkoutMs).toBe(0);

    const snapshotAt1s = deriveTabataSnapshot(1000);
    expect(snapshotAt1s.phase).toBe('preparing');
    expect(snapshotAt1s.remainingSeconds).toBe(2);
    expect(snapshotAt1s.elapsedWorkoutMs).toBe(0);

    const snapshotAt2s = deriveTabataSnapshot(2000);
    expect(snapshotAt2s.phase).toBe('preparing');
    expect(snapshotAt2s.remainingSeconds).toBe(1);
    expect(snapshotAt2s.elapsedWorkoutMs).toBe(0);
  });

  it('3 秒準備結束後進入第一組運動 20 秒，倒數由 20 開始', () => {
    const snapshot = deriveTabataSnapshot(3000);
    expect(snapshot.phase).toBe('running');
    expect(snapshot.round).toBe(1);
    expect(snapshot.stageType).toBe('work');
    expect(snapshot.remainingSeconds).toBe(20);
    expect(snapshot.elapsedWorkoutMs).toBe(0);
  });

  it('倒數顯示至 1 後立即切換至下一階段起始秒數，不顯示額外的 0', () => {
    // 運動 20 秒：3000ms ~ 23000ms
    // 22000ms（剩餘 1 秒）
    const atLastSecond = deriveTabataSnapshot(22000);
    expect(atLastSecond.remainingSeconds).toBe(1);
    expect(atLastSecond.stageType).toBe('work');
    expect(atLastSecond.round).toBe(1);

    // 23000ms 剛好進入休息 10 秒第一瞬間，直接顯示 10
    const atTransition = deriveTabataSnapshot(23000);
    expect(atTransition.remainingSeconds).toBe(10);
    expect(atTransition.stageType).toBe('rest');
    expect(atTransition.round).toBe(1);
  });

  it('第四組運動 20 秒結束後（總經過 113 秒）直接完成', () => {
    // 3000ms prepare + 110000ms workout = 113000ms
    const justBeforeEnd = deriveTabataSnapshot(112999);
    expect(justBeforeEnd.phase).toBe('running');
    expect(justBeforeEnd.round).toBe(4);
    expect(justBeforeEnd.remainingSeconds).toBe(1);

    const atEnd = deriveTabataSnapshot(113000);
    expect(atEnd.phase).toBe('completed');
    expect(atEnd.isFinished).toBe(true);
    expect(atEnd.elapsedWorkoutMs).toBe(110_000);
  });

  it('即便 callback 延遲，仍依累計經過時間推導正確階段與秒數', () => {
    // 跳躍到經過 40 秒（3000ms prepare + 37000ms workout）
    // Stage 0: work 20s (0~20)
    // Stage 1: rest 10s (20~30)
    // Stage 2: work 20s (30~50) -> 37s 時在 Stage 2 (Round 2 work)，已經過 7s，剩餘 13s
    const snapshot = deriveTabataSnapshot(40000);
    expect(snapshot.phase).toBe('running');
    expect(snapshot.round).toBe(2);
    expect(snapshot.stageType).toBe('work');
    expect(snapshot.remainingSeconds).toBe(13);
  });

  it('音訊與語音事件：準備階段播放「準備」語音與 3、2、1 倒數音效', () => {
    // 0ms: 進入準備階段發出「準備」語音與 3s 倒數提示音
    const eventsAt0 = getTabataEvents(0, 0);
    expect(eventsAt0.voices).toContain('prepare');
    expect(eventsAt0.cues).toContain('prepare_countdown');

    // 1000ms: 2s 倒數提示音
    const eventsAt1 = getTabataEvents(0, 1000);
    expect(eventsAt1.cues).toContain('prepare_countdown');

    // 2000ms: 1s 倒數提示音
    const eventsAt2 = getTabataEvents(1000, 2000);
    expect(eventsAt2.cues).toContain('prepare_countdown');
  });

  it('音訊與語音事件：運動與休息邊界依序發出指定短句，不逐秒語音倒數', () => {
    // 進入第一組運動 (3000ms): 發出「開始」語音
    const eventsWork1 = getTabataEvents(2900, 3000);
    expect(eventsWork1.voices).toContain('work_1');

    // 進入第一組休息 (23000ms): 發出「休息」語音
    const eventsRest1 = getTabataEvents(22900, 23000);
    expect(eventsRest1.voices).toContain('rest_1');

    // 進入第二組運動 (33000ms): 發出「第二組，開始」
    const eventsWork2 = getTabataEvents(32900, 33000);
    expect(eventsWork2.voices).toContain('work_2');

    // 進入第四組運動 (93000ms): 發出「最後一組」
    const eventsWork4 = getTabataEvents(92900, 93000);
    expect(eventsWork4.voices).toContain('work_4');

    // 訓練完成 (113000ms): 發出「完成」語音與完成音效
    const eventsComplete = getTabataEvents(112900, 113000);
    expect(eventsComplete.voices).toContain('completed');
    expect(eventsComplete.cues).toContain('completion');
  });

  it('音訊與語音事件：各運動與休息階段剩餘 5、4、3、2、1 秒皆發出 stage_countdown 提示音，不出現舊提示音', () => {
    // Round 1 work 20s (3000ms ~ 23000ms)
    // 剩餘 5 秒為 15 秒已過 = 18000ms
    const eventsCountdown5 = getTabataEvents(17900, 18000);
    expect(eventsCountdown5.cues).toContain('stage_countdown');

    // 剩餘 4 秒 = 19000ms
    const eventsCountdown4 = getTabataEvents(18900, 19000);
    expect(eventsCountdown4.cues).toContain('stage_countdown');

    // 剩餘 3 秒 = 20000ms
    const eventsCountdown3 = getTabataEvents(19900, 20000);
    expect(eventsCountdown3.cues).toContain('stage_countdown');

    // 剩餘 2 秒 = 21000ms
    const eventsCountdown2 = getTabataEvents(20900, 21000);
    expect(eventsCountdown2.cues).toContain('stage_countdown');

    // 剩餘 1 秒 = 22000ms
    const eventsCountdown1 = getTabataEvents(21900, 22000);
    expect(eventsCountdown1.cues).toContain('stage_countdown');

    // 全程不應包含舊 warning_5s 或 countdown
    const allEvents = getTabataEvents(0, 120000);
    expect((allEvents.cues as string[])).not.toContain('warning_5s');
    expect((allEvents.cues as string[])).not.toContain('countdown');
  });
});
