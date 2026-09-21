export const colors = {
  // 背景與表面
  canvas: '#FAF9F6', // 暖白，避免純白刺眼
  surface: '#FFFFFF', // 實心表面
  surfaceSubtle: '#F1F5F9', // 淺灰微表面

  // 晨光自然小徑裝飾色：只作低對比背景，不承擔任何狀態語意
  natureSky: '#DCEAE6',
  natureFoliage: '#A8B99F',
  natureFoliageDeep: '#7C9076',
  natureSoil: '#CAB99D',
  natureSun: '#F1D997',

  // 主要文字
  ink: '#1E293B', // 深灰藍，確保 pastel 背景上的對比度
  muted: '#64748B', // 次要說明文字

  // 功能角色色彩 (日系果凍 × 柔和陽光)
  primary: '#2A87AD', // 淺藍主要操作
  primaryLight: '#E0F2FE', // 淺藍高光／表面
  primaryBorder: '#BAE6FD', // 淺藍邊框

  work: '#E11D48', // 運動階段深粉紅
  workLight: '#FFE4E6', // 運動階段淺粉紅

  rest: '#2A87AD', // 休息階段
  restLight: '#E0F2FE',

  today: '#D97706', // 今天深黃／琥珀
  todayLight: '#FEF9C3', // 今天淺黃底色
  todayBorder: '#FDE047', // 今天外框

  success: '#16A34A', // 完成狀態深綠
  successLight: '#DCFCE7', // 完成狀態淺綠

  error: '#DC2626', // 錯誤狀態
  errorLight: '#FEE2E2',

  border: '#E2E8F0', // 預設柔和邊框
} as const;

export const natureColors = {
  sky: colors.natureSky,
  foliage: colors.natureFoliage,
  foliageDeep: colors.natureFoliageDeep,
  soil: colors.natureSoil,
  sun: colors.natureSun,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  full: 999,
} as const;

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    title: 24,
    hero: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
