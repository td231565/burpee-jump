/**
 * 日期與時間工具純函式
 * UI locale: zh-TW
 * 日期 key: 裝置當地時間 YYYY-MM-DD
 */

/**
 * 取得指定 Date 的當地日期字串 (YYYY-MM-DD)
 */
export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化年份與月份為繁體中文顯示 (例: 2026 年 9 月)
 */
export function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year} 年 ${month} 月`;
}

/**
 * 格式化月日為繁體中文顯示 (例: 9 月 9 日)
 */
export function formatMonthDay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month} 月 ${day} 日`;
}

/**
 * 格式化 YYYY-MM-DD 日期字串為繁體中文完整年月日顯示 (例: 2026 年 9 月 9 日)
 */
export function formatDetailDate(localDate: string): string {
  const [yearStr, monthStr, dayStr] = localDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  return `${year} 年 ${month} 月 ${day} 日`;
}

/**
 * 將 UTC 完成時間依指定或目前時區格式化為 12 小時制字串，並標示「目前時區」
 */
export function formatCompletedDateTime(
  utcIsoString: string,
  timeZone?: string
): string {
  const date = new Date(utcIsoString);
  const tzOptions = timeZone ? { timeZone } : {};
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...tzOptions,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hour24 = parseInt(getPart('hour'), 10);
  const minute = getPart('minute').padStart(2, '0');

  const period = hour24 < 12 ? '上午' : '下午';
  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }

  return `${year} 年 ${month} 月 ${day} 日 ${period} ${hour12}:${minute}（目前時區）`;
}

/**
 * 判斷兩個日期是否為同一個當地日
 */
export function isSameLocalDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 取得指定月份的第一天與最後一天之 local_date key
 */
export function getMonthDateRange(year: number, month: number): {
  startDate: string;
  endDate: string;
} {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    startDate: formatLocalDateKey(firstDay),
    endDate: formatLocalDateKey(lastDay),
  };
}

export interface CalendarCell {
  localDate: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

/**
 * 產生指定月份的 42 格日曆資料 (6 週 × 7 天，週一為每週第一天)
 */
export function generateMonthGrid(
  year: number,
  month: number,
  today: Date = new Date()
): CalendarCell[] {
  const todayKey = formatLocalDateKey(today);
  const firstOfMonth = new Date(year, month - 1, 1);
  const leadingDays = (firstOfMonth.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(year, month - 1, 1 - leadingDays + i);
    const localDate = formatLocalDateKey(cellDate);
    const isCurrentMonth =
      cellDate.getFullYear() === year && cellDate.getMonth() + 1 === month;
    const isToday = localDate === todayKey;
    const isPast = localDate < todayKey;
    const isFuture = localDate > todayKey;

    cells.push({
      localDate,
      day: cellDate.getDate(),
      isCurrentMonth,
      isToday,
      isPast,
      isFuture,
    });
  }

  return cells;
}

/**
 * 計算上一月份之年份與月份
 */
export function getPreviousMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * 計算下一月份之年份與月份
 */
export function getNextMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

