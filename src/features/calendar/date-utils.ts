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
