# 波比跳日曆 Phase 2 Additional 實作計畫

> 狀態：已確認，待實作
> 建立日期：2026-09-19
> 最後確認：2026-09-21
> 需求依據：使用者需求調整、`PRODUCT_SPEC.md` 第 3.1、3.6、3.7、4.1 節
> 階段名稱：Phase 2 Additional「首頁視覺重構、底部導覽、日曆佈局、挑戰入口與階段倒數提示音」

---

## 1. 交付目標

本階段在不改動既有 Tabata 時長、挑戰資料契約與完成紀錄語意的前提下，完成五項調整：

1. 以標準底部導覽列取代垂直 pager 與右上側邊導覽。
2. 將首頁收斂為溫和且清楚的今日訓練入口，以大型純文字 `GO` 取代實體主按鈕。
3. 將日曆改為最少完整週網格，並在 320dp 窄螢幕維持七欄。
4. 將挑戰建立入口與進行中摘要集中至日曆頁，並補齊 challenge／streak 的獨立載入與錯誤狀態。
5. 將各運動與休息階段最後 5、4、3、2、1 秒統一為同款階段倒數提示音。

本階段強調「每天動一下」的低壓力邀請感，不把首頁設計成競技訓練或要求使用者追加運動的介面。

---

## 2. 已確認的產品契約

### 2.1 首頁與 GO

- 首頁核心內容依序為：今天日期、今日訓練狀態、引導語「準備開始今天的訓練了嗎」、純文字 `GO`。
- `GO` 只在今日狀態成功確認為「今日待完成」或「今日為休息日」時顯示。
- 今日已完成時不顯示 `GO`，改在底部次要操作區顯示 secondary button「再做一次」，並以 `mode=unrecorded` 進入不記錄訓練。
- 今日狀態 loading 時只顯示日期與載入指示，不預先宣告狀態、不顯示引導語或 `GO`。
- 今日狀態 unavailable 時顯示「暫時無法讀取今日紀錄」，不顯示 `GO`；保留「重新載入」、「開始訓練」與既有不記錄警告文字。
- 休息日點擊 `GO` 沿用既有每日訓練契約：取消或儲存失敗時保留休息日；完整訓練成功儲存後轉為完成日並退還休息額度。
- 移除 `todayStatusCard` 的白底、邊框與圓角，文字直接位於 `NatureBackdrop` 上。
- 首頁核心區的視覺中心位於分頁可用內容高度的 40%。可用高度不含 Safe Area 與底部導覽；小螢幕或大字體時以不重疊及可捲動為優先。
- 首頁不再顯示挑戰建立入口或進行中挑戰摘要；「把今天設為休息日」／「取消休息」仍保留為底部次要操作。

### 2.2 GO 視覺、觸控與動效

- `GO` 使用原生 `Animated.Text`，不使用 SVG。
- 外觀無背景、無邊框；外層 `Pressable` 提供完整觸控區。
- 一般字級下，觸控區約為可用內容寬度 50%；系統字級放大時可擴展至接近全寬，不裁切文字。
- 使用 `useWindowDimensions()` 計算基準字級：

  ```ts
  const goFontSize = Math.min(120, Math.max(88, width * 0.28));
  ```

- 視窗尺寸或旋轉改變時即時重算；不使用 CSS `vw` 字串或一次性的 `Dimensions.get()`。
- 文字使用全域柔和天空藍 `#2A87AD`；光暈使用同色低透明度 `rgba(42, 135, 173, 0.28)`，不混用完成綠。
- 呼吸動畫為 `scale: 1 → 1.025 → 1`，完整循環 3.2 秒，平滑 ease-in-out，不使用彈跳，不同步閃爍文字或光暈。
- 初次掛載讀取 Reduce Motion，並訂閱 `reduceMotionChanged`：
  - 開啟時立即停止 loop 並重設 `scale: 1`。
  - 關閉且 `GO` 仍可見時重新開始。
  - 切到日曆、今日狀態改變或元件卸載時停止 loop。
- 無障礙角色為 button，名稱為「GO，開始今天的 2 分鐘」。

### 2.3 底部導覽

- 移除全螢幕垂直 `ScrollView` pager、`pagerHeight`、`pagerRef`、捲動頁碼推導及 `sideNav`。
- 使用語意狀態，不使用數字頁碼：

  ```ts
  type HomeTab = 'home' | 'calendar';
  const [activeTab, setActiveTab] = useState<HomeTab>('home');
  ```

- 不引入第三方導覽庫，也不為未確認的第三、第四個 tab 建立通用 registry 或自製框架。
- 底部導覽固定於 Safe Area 內，包含「首頁」與「日曆」兩個圖示＋文字 tab。
- 底欄使用實心表面，無上分隔線、無陰影、無懸浮外框、無選取膠囊。
- 一般字級下內容最小高度為 52dp，另加 bottom Safe Area；系統字級放大時允許底欄增高。
- 選取 tab 使用 `#2A87AD` 圖示與粗體文字，未選取 tab 使用 muted 色。
- 使用 `tablist`、`tab` 與 `accessibilityState.selected`。直接點擊 tab 時不額外手動宣告，避免與原生選取朗讀重複。
- Android 在日曆 tab 按系統返回鍵時先切回首頁並宣告「首頁」；已在首頁時沿用系統返回行為。
- 再次點擊目前已選取 tab 為 no-op，不重設月份、不捲回頂端、不重新查詢。
- 首頁與日曆使用各自的內容 ScrollView；底部導覽不隨內容捲動。
- 同一次 App 執行期間保留日曆的檢視月份與捲動位置。切換 tab、進入日期詳情或挑戰畫面再返回時不得擅自重設。
- 非目前 tab 不可互動並排除於無障礙樹；跨日資料刷新不改變目前 tab、日曆月份或捲動位置。

### 2.4 日曆卡片與最少完整週網格

- 月份導覽、連續訓練天數、進行中挑戰摘要與「回到今天」移入日曆卡片，位於星期列正上方。
- 顯示順序為：月份導覽 → 連續訓練天數 → 進行中挑戰摘要 → 回到今天（需要時）→ 星期列 → 日期網格。
- 不顯示挑戰起迄日文字；日期格既有範圍標記繼續表達挑戰期間。
- 月曆固定使用星期一至星期日七欄，不依螢幕寬度自動改為清單、單週模式或其他版型。
- 網格採「最少完整週」契約：

  ```ts
  const leadingDays = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  ```

- 依月份產生 28、35 或 42 格；不寫死一般月份為 35 格。
- 保留首週與末週為了完整七日排列所需的上月／下月補位日期；不產生完全不含本月日期的多餘整列。
- 補位日期維持低對比且不可點擊；月份切換只由月份控制操作進行。
- 七欄必須在 320dp 寬度不換錯列、不裁切、不橫向捲動：
  - 七欄使用相等欄寬。
  - 移除會使窄螢幕換列的 `minWidth: 44`＋百分比寬度組合。
  - 低於 360dp 時，日曆卡片使用接近滿版的水平配置與最小內距，使每格觸控區仍約 44dp。

### 2.5 挑戰入口、摘要與錯誤狀態

- 無進行中挑戰時，「設定挑戰週期」放在日曆 ScrollView 中、緊接日曆網格之後；它隨內容捲動，不形成第二層固定底欄。
- 進行中挑戰在日曆卡片標題區顯示「挑戰還有 x 天，可用休息 y 天」，取代舊的起迄日文字。
- x 與 y 的領域定義仍分別是「挑戰剩餘天數」與「剩餘休息額度」；「可用休息」只是使用者可見文案。
- challenge 與 streak 必須拆成獨立查詢與錯誤邊界，不因其中一項失敗而清空另一項成功結果。
- challenge 使用 `loading / none / active / unavailable`：
  - 只有成功確認為 `none` 時顯示「設定挑戰週期」。
  - `active` 顯示進行中摘要。
  - `loading` 不預先顯示建立入口。
  - `unavailable` 顯示灰色「暫時無法讀取挑戰資料」與 refresh icon；整列至少 44dp 高、可點擊，角色為 button，名稱為「重新載入挑戰資料」，且只重載 challenge。
- streak 使用 `loading / ready / unavailable`：
  - `loading` 顯示小型載入指示，名稱為「載入連續訓練天數」。
  - `ready` 顯示「已連續訓練 x 天」。
  - `unavailable` 顯示灰色「暫時無法讀取連續天數」與 refresh icon；整列可點擊且只重載 streak。
  - 錯誤不得顯示成 `0 天`。
- 挑戰建立畫面只從日曆進入。手動返回或建立成功皆回到原日曆狀態；返回操作的無障礙名稱改為「返回日曆」。
- 建立成功返回後重新載入 challenge 與日曆標記，顯示新的進行中摘要；不另設成功頁。

### 2.6 全域天空藍

- `colors.primary` 與 `colors.rest` 都由 `#0284C7` 更新為 `#2A87AD`。
- 兩者保留為獨立語意 token，不以單一欄位綁死，方便未來分別調整。
- 現有 `primaryLight`、`primaryBorder` 與 `restLight` 暫不擴大改色；實機視覺驗收若顯示不協調，再在本階段內做最小微調。
- 新色在暖白背景的對比約為 3.86:1，在既有休息淺藍表面的對比約為 3.54:1，足以支撐巨大 GO、圖示及大型粗體休息狀態。

### 2.7 階段 5、4、3、2、1 提示音

- 開始前 3 秒準備倒數維持 `prepare_countdown`，不受影響。
- 每個運動與休息階段在剩餘 5、4、3、2、1 秒各派發一次同款 `stage_countdown`。
- 原 `cue_warning_5s.wav` 內容長 0.25 秒，可每秒重播且不重疊；資產重新命名為 `cue_stage_countdown.wav`。
- `SoundCueKey`、audio service mapping、排程與測試中的 `warning_5s` 全部改名為 `stage_countdown`。
- 完整移除舊 `countdown` key、audio service mapping 與 `assets/audio/cue_countdown.wav`。
- 完成音效與階段邊界導引語音維持不變，不加入逐秒語音。
- 排程採最小迴圈，避免五行重複事件：

  ```ts
  for (let remaining = 5; remaining >= 1; remaining -= 1) {
    cues.push({
      timeMs: currentStartMs + (duration - remaining) * 1000,
      event: 'stage_countdown',
    });
  }
  ```

---

## 3. 範圍

### 3.1 納入

- 首頁與日曆改為固定 Bottom Tab Bar＋各自 ScrollView。
- 首頁無卡片核心區、響應式 GO、呼吸動效與 Reduce Motion 完整生命週期。
- 今日 loading／unavailable／pending／rest／completed 五種首頁呈現。
- 全域 primary／rest 天空藍更新。
- 日曆卡片標題整併、動態 28／35／42 格、320dp 七欄配置。
- 挑戰入口與摘要移至日曆、挑戰建立後返回日曆。
- challenge／streak 查詢狀態與獨立 refresh。
- 階段倒數事件與音訊資產重新命名、舊倒數資產移除。
- 對應自動化測試、窄螢幕與無障礙驗收。
- 同步更新 `PRODUCT_SPEC.md`、`DESIGN.md`、`CONTEXT.md` 與 `PRODUCT_DISCUSSIONS.md`。

### 3.2 不納入

- 不改動 20 秒運動、10 秒休息、四組、3 秒準備與 110 秒正式訓練總長。
- 不改動 `/challenge` 的 7／14／30 天選項、建立資料契約或不能中途取消的規則。
- 不改動每日完成、休息日取代、補登、結算或連續天數的領域算法。
- 不引入第三方導覽、手勢、動畫或日曆套件。
- 不加入第三／第四個 tab、替代日曆版型、pull-to-refresh 或通用導航抽象。
- 不修改 `PHASE_2_IMPLEMENTATION_PLAN.md` 或 MVP／Phase 1 歷史計畫。

---

## 4. 預計檔案變更

### 4.1 程式與資產

1. `src/app/index.tsx`
   - 移除 pager／sideNav，新增語意 tab state、兩個內容 ScrollView、固定 Bottom Tab Bar 與 Android 返回處理。
   - 重組首頁 GO 與各今日狀態。
   - 重組日曆卡片、挑戰入口、challenge／streak 狀態與 refresh。
2. `src/app/challenge.tsx`
   - 返回語意改為日曆；建立成功後回到原日曆狀態。
3. `src/theme/tokens.ts`
   - 更新 `primary` 與 `rest` 為 `#2A87AD`。
4. `src/features/calendar/date-utils.ts`
   - `generateMonthGrid` 改為最少完整週網格。
5. `src/features/calendar/components/month-calendar.tsx`
   - 支援 28／35／42 格及 320dp 七欄配置。
6. `src/features/calendar/components/calendar-day.tsx`
   - 只調整窄螢幕欄寬／觸控配置所需樣式，不改日期狀態語意。
7. `src/features/workout/tabata.ts`
   - 將 `warning_5s`／`countdown` 收斂為 `stage_countdown` 的 5 至 1 秒排程。
8. `src/features/workout/audio-service.ts`
   - 更新 cue mapping，移除舊 `countdown`。
9. `assets/audio/cue_warning_5s.wav`
   - 重新命名為 `assets/audio/cue_stage_countdown.wav`，音訊內容不變。
10. `assets/audio/cue_countdown.wav`
    - 刪除。

### 4.2 測試

1. `__tests__/index.test.tsx`
   - tab 角色／選取狀態、no-op 重點、Android 返回、頁面無障礙隱藏。
   - GO 的狀態矩陣、導航、字級規則、Reduce Motion 與動畫停止。
   - completed 的 secondary「再做一次」及 unavailable 安全降級。
2. `__tests__/home-challenge-integration.test.tsx`
   - 挑戰入口與摘要位於日曆；challenge loading／none／active／unavailable 及 retry。
   - challenge 與 streak 失敗互不清空。
3. `__tests__/challenge-screen.test.tsx`
   - 返回名稱與建立成功後返回日曆。
4. `__tests__/date-utils.test.ts`
   - 28、35、42 格代表月份；週一開週；必要補位；沒有全補位多餘列。
5. `__tests__/month-calendar.test.tsx`
   - 動態列數及 320dp 七欄不換列。
6. `__tests__/tabata.test.ts`
   - 每一運動／休息階段剩餘 5、4、3、2、1 秒皆派發 `stage_countdown`；不再出現 `warning_5s` 或 `countdown`。
7. `__tests__/audio-service.test.ts`
   - 新 cue key 可載入、seek 與播放；舊 key 不存在。

### 4.3 文件

- `docs/PRODUCT_SPEC.md`：現行規格與 Phase 2 Additional 狀態、導覽、首頁、日曆、挑戰入口及音效。
- `docs/DESIGN.md`：天空藍 token、GO、Bottom Tab Bar 與動態週數七欄月曆。
- `docs/CONTEXT.md`：首頁主要訓練操作、分頁導覽及補位日期共同語言。
- `docs/PRODUCT_DISCUSSIONS.md`：2026-09-21 Phase 2 Additional 已確認決議。
- 本文件：唯一的 Phase 2 Additional 實作與驗收依據。

---

## 5. 驗收標準

### 5.1 首頁與視覺

- 首頁無 `todayStatusCard` 白框，核心視覺中心位於可用高度約 40%。
- pending／rest 顯示日期、狀態、引導語與 GO；completed 不顯示 GO，顯示 secondary「再做一次」。
- loading／unavailable 不顯示 GO；unavailable 保留不記錄訓練警告與操作。
- GO 使用原生文字、基準 88–120dp、一般字級下約半寬觸控區、`#2A87AD` 同色微光暈。
- GO 以 3.2 秒、1 至 1.025 的幅度呼吸；Reduce Motion 開啟或首頁不可見時保持靜止。
- 200% 系統字級下 GO、tab label 與內容不被裁切，可透過內容捲動完整存取。

### 5.2 導覽

- 右上 sideNav 與垂直切頁手勢完全移除。
- 底部導覽固定、無分隔線與陰影，一般字級下至少 52dp＋Safe Area。
- tab 具正確 `tablist`／`tab`／selected 語意；直接點擊不重複語音宣告。
- 重點目前 tab 為 no-op；Android 日曆返回先回首頁。
- tab、日期詳情與挑戰畫面往返後保留日曆月份及捲動位置。

### 5.3 日曆與挑戰

- 月曆依月份只產生 28、35 或 42 格，保留必要補位日期且不顯示全補位多餘列。
- 320dp 寬度維持七欄，不換錯列、不裁切、不橫向捲動。
- 日曆卡片內依序顯示月份、streak、進行中挑戰摘要、回到今天、星期與網格。
- 首頁不顯示挑戰摘要或建立入口。
- 無進行中挑戰時，日曆網格後方顯示「設定挑戰週期」；建立成功後返回日曆並刷新摘要與標記。
- challenge／streak 的 loading、成功與 unavailable 各自正確呈現、各自重試，不將錯誤冒充 none 或 0。

### 5.4 音訊

- 每個運動與休息階段最後 5、4、3、2、1 秒各播放一次 `stage_countdown`。
- 準備倒數仍使用 `prepare_countdown`；完成音效與導引語音不變。
- 程式與資產中不再存在舊 `warning_5s`／`countdown` cue；舊 `cue_countdown.wav` 已移除。

### 5.5 驗證

- `npm test` 全套件通過。
- TypeScript 與 lint 檢查通過。
- iOS／Android 至少各完成一次手動驗收：一般字級、200% 字級、Reduce Motion、320dp 寬度、5 至 1 秒音訊。
- 範圍外防禦檢查通過；未核准的新增行為為無。

---

## 6. 建議實作順序

1. 先更新 date-utils 與 tabata 純函式測試，完成動態網格與 cue 契約。
2. 更新音訊 key、mapping 與資產，再跑音訊相關測試。
3. 重構 index 的語意 tab 與獨立資料狀態，再加入 Bottom Tab Bar。
4. 重組首頁 GO、日曆卡片與窄螢幕配置。
5. 更新 challenge 返回流程與整合測試。
6. 跑全套測試、型別、lint 與實機無障礙／音訊驗收。

每一步只加入使已確認行為成立的最少程式，不建立本階段未使用的導航或日曆抽象。
