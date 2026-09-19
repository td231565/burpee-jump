import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Challenge,
  SettlementOutcome,
} from '../../data/challenge-types';
import {
  addDays,
  getYesterday,
} from '../calendar/date-utils';
import { getCompletionsForMonth } from '../../data/completions';
import { getRestDaysForRange } from '../../data/rest-days';
import { getChallengeSummary, markChallengeSettled } from '../../data/challenges';

export interface SettlementEvaluation {
  outcome: SettlementOutcome;
  canRescue: boolean;
  lastDate: string;
}

/**
 * 評估已結束挑戰的結算結果與補登挽救資格
 */
export async function evaluateSettlement(
  db: SQLiteDatabase,
  challenge: Challenge,
  currentLocalDate: string
): Promise<SettlementEvaluation> {
  const startDate = challenge.start_date;
  const lastDate = addDays(startDate, challenge.duration_days - 1);

  // 取得區間內的所有完成與休息紀錄
  const completions = await getCompletionsForMonth(db, startDate, lastDate);
  const restDays = await getRestDaysForRange(db, startDate, lastDate);
  const summary = await getChallengeSummary(db, challenge, currentLocalDate);

  const completedSet = new Set(completions.map((c) => c.local_date));
  const restSet = new Set(restDays.map((r) => r.local_date));

  let missingCount = 0;
  let isLastDayMissing = false;

  for (let i = 0; i < challenge.duration_days; i++) {
    const checkDate = addDays(startDate, i);
    const hasRecord = completedSet.has(checkDate) || restSet.has(checkDate);
    if (!hasRecord) {
      missingCount++;
      if (checkDate === lastDate) {
        isLastDayMissing = true;
      }
    }
  }

  if (missingCount === 0) {
    return {
      outcome: 'completed',
      canRescue: false,
      lastDate,
    };
  }

  // 補登挽救條件：
  // 1. 最後一天是昨天
  // 2. 僅最後一天無紀錄（missingCount === 1 且 isLastDayMissing 為 true）
  // 3. 尚有剩餘休息額度
  const yesterdayKey = getYesterday(currentLocalDate);
  const isLastDayYesterday = lastDate === yesterdayKey;
  const canRescue =
    isLastDayYesterday &&
    missingCount === 1 &&
    isLastDayMissing &&
    summary.remainingRestQuota > 0;

  return {
    outcome: 'uncompleted',
    canRescue,
    lastDate,
  };
}

/**
 * 嘗試持久化已結算標記；若成功傳回 true，失敗傳回 false
 */
export async function persistSettlement(
  db: SQLiteDatabase,
  challengeId: number,
  settledAt: string = new Date().toISOString()
): Promise<boolean> {
  try {
    await markChallengeSettled(db, challengeId, settledAt);
    return true;
  } catch {
    return false;
  }
}
