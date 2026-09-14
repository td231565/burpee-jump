# 波比跳日曆 MVP 實作計畫

> 狀態：產品行為已釐清；採用 TDD 垂直切片；`expo-audio` 音訊焦點仍需雙平台實機驗證  
> 建立日期：2026-09-08  
> 需求依據：`PRODUCT_SPEC.md`、`PRODUCT_DISCUSSIONS.md`

## 1. 實作目標

交付一個不需註冊、可離線使用的 iOS／Android 手機 App，完成以下單一閉環：

> 開啟本月日曆 → 從今天開始訓練 → 完成固定 Tabata 倒數 → 自動保存 → 返回日曆看見完成標記

MVP 成功條件：

1. 首次開啟直接顯示目前月份，星期一為每週第一天。
2. 使用者可切換前後月份並快速回到今天。
3. 使用者可完成固定 110 秒 Tabata 流程。
4. 暫停、繼續、取消及進入背景時的行為符合本計畫。
5. 完成後自動保存，不需另外打卡。
6. 關閉並重新開啟 App 後，完成紀錄仍存在。
7. 儲存重試不新增第二筆紀錄，也不覆蓋第一次完成時間。

## 2. MVP 範圍

### 2.1 納入

- 一般月曆月視圖。
- 上一月、下一月及回到今天。
- 日期詳情。
- 固定 Tabata 計時。
- 3 秒準備倒數。
- 暫停、繼續及取消確認。
- 離線導引語音與階段提示音效。
- 一首隨 App 打包的背景音樂；素材須通過 `PRODUCT_SPEC.md`「背景音樂選取與發布規則」。
- 計時期間防止螢幕自動休眠。
- 進入背景時自動暫停。
- SQLite 本機完成紀錄。
- 儲存失敗時的手動重試。
- iOS 與 Android 手機版。
- 基本無障礙支援。

### 2.2 不納入

- Web、平板專用版及橫向介面。
- 帳號、後端、同步、備份及匯出。
- 挑戰週期、忙碌模式、休息／順延及補登。
- 連續天數、徽章、里程碑及習慣強化機制。
- 通知、震動及慶祝動畫。
- 體重、身高、BMI 及趨勢圖。
- 自訂秒數、組數及動作。
- 教學、健康警示、替代動作、個人化及社交。
- 分析 SDK 與成效指標上報。
- 背景持續計時與中斷恢復。
- Zustand 或其他 global state library。
- NativeWind、Tailwind CSS、shadcn/ui、React Native Reusables 及月曆套件。
- Maestro 設定與 E2E 測試案例。

## 3. 技術選型

| 項目 | 決策 |
| --- | --- |
| 框架 | React Native + 最新穩定版 Expo |
| 語言 | TypeScript strict mode |
| 導航 | Expo Router、native stack |
| 套件管理 | Bun，僅提交 `bun.lock` |
| 本機資料 | `expo-sqlite` |
| 防止休眠 | `expo-keep-awake` |
| 音訊 | `expo-audio`；`playsInSilentMode: true`；短提示用 `duckOthers`；若 D-042 門檻通過，背景音樂開啟時另用 `doNotMix` |
| 樣式 | React Native `StyleSheet.create` |
| Global state | 不使用；持久資料以 SQLite 為唯一真實來源 |
| 單元／元件測試 | `jest-expo`、React Native Testing Library |
| E2E | 未來採 Maestro；MVP 不安裝、不建立空設定 |
| 開發流程 | TDD；五個已確認公開 seams；每次一個 red → green 垂直行為切片 |

### 3.1 Bun 規則

- 使用 `bun create expo-app` 建立專案。
- 使用 `bun expo install` 安裝 Expo 套件。
- 使用 `bun run` 執行 scripts。
- `package.json` 固定 `packageManager` 的 Bun 版本。
- 不提交 `package-lock.json`、`yarn.lock` 或 `pnpm-lock.yaml`。
- 保留 Node.js LTS，供 Expo 建立專案與 prebuild 流程使用。
- 套件若需要 `postinstall`，審查後才加入 `trustedDependencies`。

## 4. 前端樣式與 UI 系統

### 4.1 樣式策略

採用 React Native 原生 `StyleSheet`，不加入 Tailwind 相容層。原因：

- 沒有 Tailwind／Metro 額外編譯設定。
- 不需為 NativeWind 安裝 MVP 未使用的 Reanimated peer dependency。
- 原生 style property 具有 TypeScript 檢查與 IDE 提示。
- 動態狀態、平台差異及無障礙字級可直接用 style array 表達。
- 避免未來 NativeWind／Tailwind 主版本遷移影響所有畫面。

保留 shadcn 的優點，但不使用其 Web 實作：

- UI 元件原始碼由專案持有。
- 元件組合優先於大型 UI framework。
- 變體少且明確，不建立無需求的通用抽象。
- 視覺值來自集中式 design tokens。

### 4.2 Design tokens

建立 `src/theme/tokens.ts`，集中管理：

- 語意色彩：canvas、surface、ink、muted、primary、work、rest、today、success、error。
- 間距：4、8、12、16、24、32。
- 圓角：12、18、24、999。
- 字級與字重。
- 邊框與柔和陰影。

視覺方向為「日系果凍 × 柔和陽光」：

| 色彩角色 | 使用位置 |
| --- | --- |
| 淺藍 | 主要操作、休息階段 |
| 粉紅 | 運動階段、重點提示 |
| 淺黃 | 今天、陽光裝飾 |
| 淺綠 | 完成狀態 |
| 深灰藍 | 主要文字，確保 pastel 背景上的對比度 |
| 暖白 | App 背景，避免純白刺眼 |

原生程式使用相容的色碼 token；設計選色以 OKLCH 控制明度與彩度後轉為 native color value。

果凍感使用以下方式完成：

- 大圓角與 `borderCurve: 'continuous'`。
- 淡色實心表面、細邊框、局部高光與帶色柔和陰影。
- Pressable 的 pressed／disabled 狀態。
- 不使用玻璃模糊、漸層文字或高飽和裝飾。
- MVP 不加入裝飾性動畫。

### 4.3 最小 UI primitives

只建立實際需要的元件：

```text
src/components/ui/
├── app-text.tsx
├── button.tsx
├── icon-button.tsx
└── confirm-dialog.tsx
```

產品專屬元件留在 feature 內，不塞入通用 UI 層：

```text
src/features/calendar/components/calendar-day.tsx
src/features/calendar/components/month-calendar.tsx
src/features/workout/components/timer-display.tsx
```

### 4.4 無障礙與互動

- 所有按鈕至少提供 44 × 44 可點擊區域。
- 日期狀態同時使用顏色、圖示及無障礙標籤。
- 支援系統字級；重要控制不得因放大文字而消失。
- 今日、完成及選擇狀態具有不同語意標籤。
- 主要文字與 pastel 背景維持可讀對比。
- 使用 `Pressable`，不使用 `TouchableOpacity`。
- 對話框使用 native stack modal 或 React Native `Modal`，不建立自製 Portal 系統。

## 5. 導航與畫面

使用 Expo Router native stack：

```text
src/app/
├── _layout.tsx
├── index.tsx       # 本月日曆
├── workout.tsx     # 準備與計時
└── day.tsx         # 日期詳情 modal
```

### 5.1 日曆首頁

- 頁首顯示完整年份與月份。
- 提供上一月、下一月及「今天」按鈕。
- 頁首提供至少 44 × 44 的設定 icon button，無障礙標籤「設定」；點擊開啟「音訊設定」 modal。
- 星期列由星期一開始。
- 固定產生 42 個日期格，維持六週高度穩定。
- 顯示目前月份時，頁面依今日狀態顯示單一主要操作「開始今天的 2 分鐘」或不可開始的「今天完成了」。
- 顯示非目前月份時，主要操作改為「回到今天」，不提供訓練入口。
- 點擊日期格開啟日期詳情，不直接開始訓練。
- 只有主要操作可以進入今天的訓練。
- 今天已完成時，主要操作改為不可啟動訓練的「今天完成了」狀態。
- 畫面重新取得焦點時查詢當月 SQLite 紀錄。

日期狀態：

| 日期 | 顯示方式 |
| --- | --- |
| 已完成 | 淺綠果凍標記加勾號 |
| 今天未完成 | 淺黃外框或空心標記 |
| 過去無紀錄 | 保持空白，不推論使用者未運動或未完成任務 |
| 未來日期 | 不顯示運動狀態，且不可點擊 |
| 非本月補位格 | 降低文字對比，不顯示運動狀態，且不可點擊 |

月份只使用頁首按鈕切換，不支援滑動手勢；補位日期不開啟詳情或切換月份；不限制可查看年份範圍。

### 5.2 日期詳情

- 以 modal 呈現。
- 顯示完整年月日。
- 顯示完成日、今日待完成或無紀錄日。
- 已完成時，以 `zh-TW` 12 小時制及裝置目前時區顯示第一次完成日期與時間，並標示「目前時區」。
- 詳情中的完整日期是固定歸屬日；跨時區後，顯示完成日期可能不同，但不得改動歸屬日。
- 不提供開始、補登、修改或刪除紀錄。
- 只有目前月份中的今天與過去日期可開啟；未來日期不開啟空白詳情。

### 5.3 準備與計時畫面

進入畫面後先顯示固定內容：

- 運動 20 秒。
- 休息 10 秒。
- 4 組，最後一組後不休息。
- 主要操作「開始」。

音訊開關不出現在準備或正式計時畫面；訓練畫面進入時讀取已保存偏好。

按下開始後先執行 3 秒準備倒數，再開始正式流程。準備倒數不計入訓練時間或完成門檻。

## 6. Tabata 計時設計

### 6.1 固定流程

```text
運動 20 秒
休息 10 秒
運動 20 秒
休息 10 秒
運動 20 秒
休息 10 秒
運動 20 秒
完成
```

實際訓練時間為 110 秒；產品文案仍使用易懂的「2 分鐘」。3 秒準備倒數位於正式訓練之前，因此無暫停時，從按下「開始」到訓練結束共 113 秒。

倒數顯示 `20 → 1` 或 `10 → 1`，階段到期立即顯示下一階段的起始秒數，不顯示額外一秒的 `0`。

### 6.2 狀態模型

```text
ready
  → preparing
  → running
  ↔ paused
  → saving
  → completed

saving
  → saveError
  → saving（手動重試）

ready／preparing／running／paused
  → cancelled
```

使用畫面內的 `useReducer` 管理狀態，不把計時狀態放入 global store。

### 6.3 精確度

- 使用 `performance.now()` 作為單調時間來源。
- 預先建立七個階段的累積時間邊界。
- 依實際經過時間推導目前階段與剩餘秒數。
- 不使用 `setInterval(() => remaining - 1)` 累積誤差。
- callback 延遲後直接推導正確階段，不補跑漏掉的 tick。
- 暫停時保存已經過時間；繼續時重建時間基準。

### 6.4 效能

- 約每 100 至 200 毫秒檢查一次時間。
- 毫秒值不寫入 React state。
- 只有顯示秒數、階段或狀態改變時才 dispatch。
- 正常倒數最多每秒產生一次 React render。
- 不使用 `requestAnimationFrame`、Reanimated shared value 或背景 timer。
- 畫面只衍生目前組數、階段文案及色彩，不保存重複 state。
- 實作後以 React DevTools／Profiler 確認沒有每 100 毫秒重繪。

### 6.5 暫停、背景與取消

- 使用者可手動暫停及繼續。
- App 進入 inactive／background 時立即暫停。
- 返回前景後不自動繼續，由使用者選擇繼續或取消。
- 自動暫停涵蓋準備倒數與正式計時；重複的 AppState 事件不得重設已經過時間。
- 手動或安全暫停時，同步暫停內建音樂、清除待播語音／提示並解除 Ducking 或獨占音訊焦點；不直接控制第三方播放器。
- 繼續時從原位置恢復內建音樂，提示排程只依目前計時位置重建，不補播已錯過事件。
- 完成、取消或離開時停止並釋放 App 音訊，且解除 Ducking。
- 暫停狀態只存在畫面記憶體，不寫入 SQLite 或其他持久化儲存。
- App 被系統或使用者終止後不恢復未完成訓練，也不寫入完成紀錄。
- 準備倒數或正式計時狀態期間啟用 KeepAwake；離開流程或完成後立即釋放。
- `ready` 或 `preparing` 可直接返回或取消，不顯示確認。
- 只有正式計時進入 `running`，或從正式訓練進入 `paused` 後，取消及系統返回鍵才顯示確認。
- 取消後不保存任何完成紀錄。

## 7. 日期與時間規則

- UI locale：`zh-TW`。
- 每週第一天：星期一。
- 完成時間：12 小時制，包含上午／下午。
- 日期 key：裝置當地時間的 `YYYY-MM-DD`。
- 歸屬日期：按下計時畫面的「開始」、進入 3 秒準備倒數時的裝置當地日期；單純進入畫面不鎖定。
- `completed_at`：實際完成時的 UTC ISO 8601 timestamp。
- 跨午夜完成仍記在開始訓練時的日期。
- 跨午夜完成後，新當地日沒有完成紀錄時，其每日訓練入口仍可使用；MVP 不增加冷卻或封鎖規則。
- 已寫入的 `local_date` 不因旅行或時區變更而改變。
- 新訓練使用開始當下的裝置時區。
- 不儲存完成當下的時區。
- 日期詳情將 `completed_at` 依查看當下的裝置時區格式化，並標示「目前時區」。
- 目前時區轉換只影響顯示，不得重新計算 `local_date` 或日曆統計。
- MVP 不提供時區修正 UI。

日期計算集中為純函式，不在各畫面分散呼叫與拼接。

## 8. 本機資料設計

進入 Phase 3 前依 `PRODUCT_SPEC.md`「背景音樂選取與發布規則」完成 D-042 發布判定；無論是否已有合格音檔，皆採用下列三項音訊偏好 schema。門檻未通過時只移除背景音樂素材；`music_enabled`、設定 UI、背景音樂程式與測試保持原狀。

### 8.1 Schema

```sql
CREATE TABLE IF NOT EXISTS daily_completions (
  local_date TEXT PRIMARY KEY NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_preferences (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  voice_enabled INTEGER NOT NULL DEFAULT 1 CHECK (voice_enabled IN (0, 1)),
  cues_enabled INTEGER NOT NULL DEFAULT 1 CHECK (cues_enabled IN (0, 1)),
  music_enabled INTEGER NOT NULL DEFAULT 1 CHECK (music_enabled IN (0, 1))
);

INSERT OR IGNORE INTO audio_preferences
  (id, voice_enabled, cues_enabled, music_enabled)
VALUES (1, 1, 1, 1);
```

MVP 不為 Post-MVP 預先加入 status、challenge_id、rounds 或 duration 欄位。

### 8.2 初始化與存取

- `_layout.tsx` 使用 `SQLiteProvider`。
- 初始化時建立 schema。
- 不引入 ORM 或 migration framework。
- 初始 schema 使用 `PRAGMA user_version = 1`；未來需要變更時再新增明確 migration。
- 所有動態 SQL 使用參數綁定。

資料存取集中在 `src/data/completions.ts`：

```text
initializeDatabase(db)
getCompletionsForMonth(db, startDate, endDate)
getCompletionByDate(db, localDate)
insertCompletion(db, localDate, completedAt)
```

音訊偏好集中在 `src/data/audio-preferences.ts`，直接讀寫固定 `id = 1` 的單列資料，不建立通用 settings framework：

```text
getAudioPreferences(db)
updateAudioPreferences(db, preferences)
```

儲存重試使用主鍵及 `ON CONFLICT(local_date) DO NOTHING` 保持冪等，因此保留第一次完成時間。

### 8.3 儲存失敗

1. 最後一組完成後進入 `saving`。
2. SQLite 寫入成功後才進入 `completed`。
3. 寫入失敗時保留本次完成資訊於目前畫面記憶體。
4. 顯示錯誤說明、「重新儲存」及「放棄紀錄」。
5. 使用者手動重試；不建立背景 queue 或自動重試服務。
6. 尚未儲存成功前，不顯示「今天已記錄」也不自動離開。
7. 點擊「放棄紀錄」、返回或以其他導覽方式離開時，確認「離開後本次完成不會被記錄」。
8. 使用者確認離開後清除記憶體資料並返回日曆，不新增完成標記。
9. App 被強制關閉或系統終止時，待儲存資料直接遺失；MVP 不做跨重啟恢復。

## 9. State ownership

| 狀態 | Owner |
| --- | --- |
| 完成紀錄 | SQLite |
| 目前顯示月份 | 日曆畫面 `useState` |
| 選擇日期 | Expo Router route parameter |
| 計時狀態 | 計時畫面 `useReducer` |
| 色彩、間距及固定秒數 | 靜態 tokens／constants |
| 儲存失敗待重試資料 | 計時畫面記憶體 |
| 音訊偏好 | SQLite `audio_preferences` 單列資料 |

MVP 不使用 Zustand。只有未來出現跨多畫面共享且尚未持久化的狀態時才重新評估，例如建立挑戰草稿或跨畫面存活的進行中訓練。

## 10. 建議目錄結構

```text
BurpeeJump/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── workout.tsx
│   │   └── day.tsx
│   ├── components/
│   │   └── ui/
│   │       ├── app-text.tsx
│   │       ├── button.tsx
│   │       ├── icon-button.tsx
│   │       └── confirm-dialog.tsx
│   ├── data/
│   │   ├── database.ts
│   │   ├── completions.ts
│   │   └── audio-preferences.ts
│   ├── features/
│   │   ├── calendar/
│   │   │   ├── components/
│   │   │   │   ├── calendar-day.tsx
│   │   │   │   └── month-calendar.tsx
│   │   │   └── date-utils.ts
│   │   └── workout/
│   │       ├── components/
│   │       │   └── timer-display.tsx
│   │       ├── tabata.ts
│   │       └── use-tabata-timer.ts
│   └── theme/
│       └── tokens.ts
├── __tests__/
├── app.json
├── bun.lock
├── package.json
└── tsconfig.json
```

若實作後某個檔案只有單一微小呼叫者，直接合併，不為維持目錄外觀保留空抽象。

### 10.1 TDD 執行規則

MVP 採用 TDD。下列五個公開測試 seams 已確認，實作期間不得自行改成測試私有細節：

1. 日期／月曆純函式：輸入明確日期與時區，觀察月格、日期 key 及顯示結果。
2. 計時推導介面：輸入鎖定日期、單調經過時間及使用者／AppState 事件，觀察公開 workout snapshot 與應發出的提示事件。
3. Completion repository：透過 exported repository functions 對隔離測試資料庫寫入及查詢，不直接斷言內部 SQL 呼叫。
4. 畫面公開互動：透過可見文字、role、無障礙名稱及使用者操作，觀察畫面、導航與保存結果。
5. 音訊協調邊界：觀察 App 在產品事件上要求播放、暫停、Duck 或釋放；不測 `expo-audio` 內部方法或呼叫次數。

每個 red → green 循環只選一個 seam 與一個行為：

1. 先以規格中的固定例子寫出一個失敗測試，並執行確認它因行為尚未存在而失敗。
2. 只加入使該測試通過的最少產品程式碼。
3. 執行目前完整測試集、typecheck 與 lint，保持綠燈後才選下一個行為。
4. 不在同一循環預作後續功能；結構整理留到該垂直切片完成後的 review，不混入 red → green。

Section 12 是待交付行為清單，不是一次寫完的測試清單。禁止先建立所有測試再批次實作，也禁止只完成 database、UI 或 hooks 等水平技術層。測試替身只放在時間、AppState、導航、音訊與失敗注入等外部邊界；不得 mock 同一功能內部 collaborator。

## 11. 實作階段與驗證

### Phase 1：專案骨架

- 以 Bun 建立 Expo TypeScript 專案。
- 清除範例畫面。
- 設定 Expo Router native stack、strict TypeScript、lint 及 test scripts。
- 安裝 `expo-sqlite`、`expo-keep-awake`、`expo-audio` 與測試依賴。

驗證：

- `bun run typecheck`
- `bun run lint`
- `bun test`
- Expo Go 可在 iOS／Android 開啟首頁。

### Phase 1.5：MVP 音訊技術驗證

只建立可丟棄的最小驗證畫面與暫用短音檔，驗證目前 MVP 已承諾但具有平台風險的音訊契約：

- 本機音檔可播放及循環。
- 背景音樂開啟時，`doNotMix` 會讓系統暫停第三方音樂，釋放焦點後由系統與第三方 App 決定是否續播。
- 背景音樂關閉時，短語音／提示使用 `duckOthers`，播放完畢後第三方音量恢復。
- App 暫停、進入背景、取消及離開時可停止 App 音訊並釋放焦點。
- `playsInSilentMode: true` 在 iPhone 靜音模式下有效，Android 行為符合相同產品語意。

驗證必須在 iOS 與 Android 實機完成。若任一核心契約失敗，先回到 D-009／D-022 修正產品規則，再進入後續階段。

此階段不建立正式音訊 UI、偏好儲存、九段語音、提示音或授權背景音樂；不加入原生模組或實驗性 workaround。正式 MVP 音訊與其餘 Tabata 整合留在 Phase 4。

### Phase 2：第一個垂直 tracer slice

- 第一個 red 測試：未有完成紀錄時，開啟 App 會顯示目前月份、今天與「開始今天的 2 分鐘」。
- 為使此行為通過，串起最小路由、SQLite 初始化、目前月份畫面與所需日期計算。
- 只建立本切片實際使用的 design token、文字及主要按鈕；圖示按鈕、確認對話框及其他狀態等首次有行為需要時才加入。
- 測試只透過畫面公開互動與 repository seam 觀察結果，不檢查 component tree、hook state 或 SQL 呼叫次數。

驗證：

- 小尺寸與大字級裝置上主要操作可見且可點擊。
- 色彩以圖示或文字輔助，不成為唯一狀態訊號。

### Phase 3：月曆行為 slices

依序執行獨立 red → green 循環，每次只加入該行為所需的 UI、純函式及 repository 程式碼：

1. 星期一開週的 42 格目前月份。
2. 上一月、下一月與「回到今天」。
3. 今天／過去日期可開啟詳情，未來與補位日期不可互動。
4. 已保存紀錄顯示完成標記與目前時區完成時間。
5. 畫面重新取得 focus 後讀取最新月份紀錄。

驗證：

- 星期一正確落在第一欄。
- 閏年二月、跨年及六週月份正確。
- 完成日、今日待完成、過去無紀錄及未來狀態正確呈現。
- 非本月補位日期降低對比、無完成狀態且不可點擊。
- 本月未來日期無完成狀態且不可點擊。

### Phase 4：Tabata 計時器

以下每個使用者可觀察行為各自形成一個 red → green slice；不得先一次建完整 reducer、hook 或全部音訊 mocks：

- 實作固定七階段時間表。
- 實作 3 秒準備、開始、暫停、繼續及取消。
- 實作離線導引語音、階段提示音、背景音樂支援及 Ducking；行為依 D-020 至 D-030 的已確認規則。D-042 門檻只決定是否隨 App 提供背景音樂素材。
- 依 D-049，正式執行契約以產品負責人提供的背景音樂檔案存在為前提；不新增缺少音檔時的 UI、焦點分流或其他執行狀態。
- 月曆頁首設定 modal 使用原生 `Switch` 提供語音、提示音效及內建背景音樂三個開關。三者皆預設開啟並立即保存至 SQLite；不實作音量滑桿或儲存／取消按鈕。
- Modal 可由關閉按鈕、Android 系統返回鍵或點擊遮罩收起，不回復已保存變更；不加入如何沿用第三方音樂的提示文字。
- 進入訓練畫面時讀取已保存偏好並套用；正式計時畫面不提供設定入口。
- 導引語音以九個 `zh-TW` 離線短句對應準備、各運動／休息邊界與完成，不實作逐秒語音倒數。
- 準備倒數在 `3、2、1` 各播放一聲；每個運動／休息階段剩餘 5 秒時播放一次柔和預警音，最後 `3、2、1` 各播放一聲不同音色的倒數音。
- 階段切換不另疊加喇叭聲；「完成」語音後播放一次明亮的完成音效。
- 若 D-042 門檻通過，依 `PRODUCT_SPEC.md`「背景音樂選取與發布規則」整合唯一一首合格素材及其證據；語音／重要提示期間降低該音軌音量，結束後恢復。門檻未通過時不打包素材，但保留相同程式能力。
- 背景音樂生命週期、`doNotMix`、內建音軌 Ducking、UI、欄位及程式分支不受 D-042 門檻影響；門檻只控制該版本是否打包合格音樂素材。
- 背景音樂開啟時，進入訓練畫面便開始播放；正常完成後持續通過完成回饋與 SQLite 儲存，成功且即將離開畫面時才停止。
- 儲存失敗時背景音樂持續循環；重試成功或放棄並離開時停止。失敗畫面進入背景時暫停。
- 不加入第三方音訊偵測或原生模組。背景音樂開啟時，以 `doNotMix` 播放內建音樂；關閉時，只在語音／提示播放期間切入 `duckOthers`，結束後立即釋放。
- 設定 `playsInSilentMode: true`，但不讀取、修改或模擬系統媒體音量。
- 音訊預載失敗時顯示一次非阻擋訊息並允許開始；訓練中音訊錯誤只停用本次音訊，計時與儲存照常。
- 不重試音訊、不補播錯過提示，也不建立音訊錯誤 modal 或恢復狀態機。
- 使用單調時間推導顯示秒數與階段。
- 實作 AppState 自動暫停及 KeepAwake。

驗證：

- 最後一組後直接完成，總時長 110 秒。
- 3 秒準備倒數結束後才開始計算 110 秒正式訓練，無暫停總流程為 113 秒。
- ready／preparing 取消直接離開；running／正式訓練 paused 取消會先確認。
- callback 延遲後不累積漂移。
- 暫停期間時間不前進。
- inactive／background 事件會暫停，回到 active 不會自動繼續。
- AppState 重複事件不改變已保存的經過時間。
- 暫停會清除待播提示並解除 Ducking；繼續不補播，內建音樂從原位置恢復。
- 正常完成時，成功儲存且即將離開畫面才釋放音訊；取消及 unmount 也會釋放。第三方音樂是否自動續播由系統與第三方 App 決定。
- React render 頻率不高於顯示需要。
- iOS 與 Android 的語音及 Ducking 行為符合 D-020 最終規則；若 D-042 門檻通過，背景音樂行為也須符合。
- 九個語音依 D-023 順序各播放一次，不漏播、重播或跨階段延遲播放。
- 階段邊界不重疊播放切換喇叭聲，完成音效只在「完成」語音後播放一次。
- 準備階段只有 `3、2、1` 提示；每個運動／休息階段各有一次 5 秒預警與三次倒數音，延遲 callback 不得補播過期音效。
- 若 D-042 門檻通過：最終素材及其授權證據完整通過 `PRODUCT_SPEC.md`「背景音樂選取與發布規則」的硬性門檻與條件式驗收。
- 若 D-042 門檻通過：背景音樂在進入訓練畫面時開始，正常完成後直到儲存成功並離開前持續播放。
- 若 D-042 門檻通過：儲存失敗畫面持續播放背景音樂，重試成功／放棄離開時停止，進入背景時暫停。
- 若 D-042 門檻通過：iOS 與 Android 在背景音樂開啟時取得並釋放獨占焦點；未納入或使用者關閉背景音樂時，只在提示期間 Duck 並恢復第三方音量。
- iPhone 靜音開關啟用時仍播放已開啟的訓練音訊；兩平台實際響度皆服從系統媒體音量。
- 模擬音檔載入／播放失敗時不阻擋開始、不停止計時且仍可成功儲存完成紀錄。
- 設定 modal 的語音、提示音效及背景音樂三個開關可獨立、立即保存並跨重啟讀回；關閉 modal 不回復變更。
- 下一次進入訓練畫面時套用最新偏好；正式計時畫面沒有設定入口。

### Phase 5：完成閉環

依序以公開畫面與 completion repository seam 完成閉環 slices：

1. 正常完成後寫入鎖定的開始日期與實際 UTC 完成時間，返回該月份並顯示完成標記。
2. 寫入失敗時停在待儲存狀態，不顯示虛假成功。
3. 手動重試成功且維持同一筆完成時間，不新增第二筆紀錄。
4. 放棄或離開前確認，確認後不產生完成紀錄。
5. 跨午夜及跨月完成仍回到 `local_date` 所在月份。

驗證：

- App 重啟後資料仍存在。
- 同一次完成重試後仍只有一筆紀錄。
- 寫入失敗時不顯示虛假的成功訊息。

### Phase 6：裝置驗收

- iOS 實機完成一次核心流程。
- Android 實機完成一次核心流程。
- 驗證背景暫停、系統返回鍵、12 小時制、跨午夜及重啟持久化。
- 完成最終 typecheck、lint 及 test。

## 12. 測試計畫

本節是行為 backlog。實作時依 Section 10.1 每次只取下一個行為，先觀察 red，再加入最少實作得到 green；不得把本節轉成預先完成的整批測試。

### 12.1 單元測試

日期：

- 星期一開週的 42 格產生結果。
- 平年與閏年二月。
- 月份與年份前後切換。
- 當地日期 key 格式。
- 12 小時制顯示。
- UTC 完成時間依目前裝置時區正確轉換。
- 時區轉換跨越日期邊界時，`local_date` 保持不變。
- 午夜前開始、午夜後完成時，紀錄使用開始日，且新當地日仍可開始訓練。
- 午夜前按下「開始」但準備倒數跨日，仍使用按鈕當下日期；進入畫面後跨日才按「開始」則使用新日期。

計時：

- 準備倒數為 3 秒且不消耗正式訓練時間。
- 七階段與 110 秒總長。
- 無暫停時，從按下「開始」到正式訓練結束共 113 秒。
- 顯示 20 到 1，不顯示額外的 0。
- 運動／休息及組數切換。
- 最後一組後直接完成。
- 暫停／繼續。
- 延遲 tick 後推導正確階段。
- 取消不進入完成。

資料：

- 月份查詢邊界。
- 首次完成插入。
- 同一次完成重試不覆蓋第一次完成時間。
- 音訊偏好首次讀取皆為開啟，更新後可跨重啟讀回。

### 12.2 元件／整合測試

- 日曆顯示本月與主要操作。
- 非目前月份只顯示「回到今天」；返回目前月份後才依今日狀態顯示開始或完成。
- 點擊日期開啟正確詳情。
- 點擊非本月補位日期不開啟詳情或切換月份。
- 點擊本月未來日期不開啟詳情。
- 開始、準備、暫停、繼續及取消確認。
- ready／preparing 返回不顯示確認；正式訓練開始後返回才顯示確認。
- 準備或正式計時失去前景後停在暫停畫面。
- 返回前景不自動續跑；重新啟動 App 不恢復未完成訓練。
- 暫停／繼續／取消時音訊與 Ducking 符合 D-026，且不補播錯過的提示。
- 完成後呼叫 repository 並顯示成功。
- 寫入失敗後可手動重試。
- 寫入失敗後放棄或離開會先確認，確認後日曆不新增完成標記。
- 強制終止後重新開啟 App，不恢復待儲存資料。
- 日曆重新取得焦點後讀取最新紀錄。
- 跨月完成後返回歸屬月份並顯示剛寫入的完成標記。

測試透過可見文字、role、無障礙名稱及 exported repository API 觀察結果。只允許替換時間、AppState、導航、音訊及明確失敗注入等外部邊界；不得斷言 reducer action、hook state、component hierarchy 或內部 collaborator 呼叫。

### 12.3 暫不實作的 E2E

未來第一批 Maestro 測試預定覆蓋：

1. 首頁 → 完整計時 → 自動保存 → 日曆完成標記。
2. 暫停／繼續。
3. 取消不保存。
4. App 重啟後紀錄仍存在。

在真正建立第一個測試時才安裝與設定 Maestro。

### 12.4 非自動化驗收

以下結果不可用 mocked Jest 測試取代：

- iOS／Android 的 `doNotMix`、`duckOthers`、音訊焦點釋放及第三方播放器恢復。
- iPhone 靜音模式與兩平台系統媒體音量行為。
- 背景音樂、語音、提示音、Ducking、loop 接點及整體聽感。
- 小尺寸、大字級、系統返回鍵、無障礙操作與實際版面。
- React Profiler 的 render 頻率與實機效能。

## 13. 最終驗收標準

- [ ] App 不需註冊即可進入目前月份。
- [ ] 月曆週一開週，可切換前後月份並回到今天。
- [ ] 非本月補位日期降低對比且不可互動，月份只由頁首按鈕切換。
- [ ] 本月未來日期不顯示完成狀態且不可互動。
- [ ] 日期格只顯示日期與完成相關狀態。
- [ ] 日期詳情顯示固定歸屬日、完成狀態，以及標示「目前時區」的 12 小時制完成日期與時間。
- [ ] 主要操作文案為「開始今天的 2 分鐘」。
- [ ] 非目前月份的主要操作為「回到今天」，且不能從歷史月份開始訓練。
- [ ] 計時流程為 20／10 × 3，加最後 20 秒運動，共 110 秒。
- [ ] 3 秒準備倒數不計入 110 秒訓練，無暫停完整流程共 113 秒。
- [ ] 導引語音及階段提示音可離線播放；若 D-042 門檻通過，授權明確的內建背景音樂也可離線播放，且 App 內 Ducking 可恢復原音量。
- [ ] 若 D-042 門檻通過，背景音樂從進入訓練畫面播放到成功儲存並離開；取消或其他離開路徑會釋放音訊。
- [ ] 若 D-042 門檻通過，儲存失敗時音樂持續，重試成功或放棄離開時停止，失敗畫面進入背景時暫停。
- [ ] 九個 `zh-TW` 導引短句只在指定階段邊界播放，不逐秒朗讀。
- [ ] 階段切換不疊加喇叭聲，完成語音後只播放一次完成音效。
- [ ] 準備階段播放 `3、2、1`；運動／休息階段播放 5 秒預警及 `3、2、1` 倒數，且不補播過期提示。
- [ ] 若 D-042 門檻通過，背景音樂開啟時使用 `doNotMix`；未納入或關閉背景音樂時，只有語音／提示期間使用 `duckOthers`，結束後正確釋放音訊焦點。
- [ ] iPhone 靜音模式下仍播放已開啟的訓練音訊，且 App 不覆寫系統媒體音量。
- [ ] 音訊載入或播放失敗時降級為靜音，不阻擋、重置或改變訓練完成紀錄。
- [ ] 月曆頁首設定按鈕可開啟「音訊設定」 modal，三個開關獨立、預設開啟並立即保存；即使 D-042 門檻未通過仍顯示背景音樂開關；不提供 App 內音量滑桿。
- [ ] 關閉設定 modal 不回復變更；下一次進入訓練畫面套用偏好，準備與正式計時畫面不顯示設定入口。
- [ ] 倒數顯示到 1 後立即切換，不停留在 0。
- [ ] 支援準備、暫停、繼續、取消確認及背景自動暫停。
- [ ] ready／preparing 可直接取消；running／正式訓練 paused 的取消與返回需確認。
- [ ] 返回前景不自動續跑，App 被終止後不恢復或記錄未完成訓練。
- [ ] 暫停、繼續、完成、取消及離開時正確停止或恢復音訊、解除 Ducking，且不控制第三方音樂。
- [ ] 計時期間螢幕不自動休眠。
- [ ] 完成後自動寫入開始當地日期。
- [ ] `local_date` 在按下「開始」進入準備倒數時鎖定，而非進入畫面或第一個運動階段時。
- [ ] 切換裝置時區只改變完成時間顯示，不重新歸類日曆紀錄。
- [ ] 跨午夜完成歸屬開始日，新當地日的訓練入口仍依自身紀錄判定。
- [ ] SQLite 寫入成功後才顯示已記錄。
- [ ] 寫入失敗可手動重試或確認放棄；不執行背景重試或跨重啟恢復。
- [ ] 返回 `local_date` 所在月份，立即看見歸屬日完成標記，包括跨月完成情境。
- [ ] 今天完成後不再提供追加訓練入口。
- [ ] 儲存重試不覆蓋第一次完成時間。
- [ ] App 重啟後完成紀錄仍存在。
- [ ] iOS 與 Android 實機核心流程通過。
- [ ] TypeScript、lint 與測試全部通過。

## 14. 範圍控管

本計畫不為 Post-MVP 預建資料欄位、global store、抽象 repository interface、動畫系統、通知架構或背景工作。發現新需求時先更新規格與本計畫，不以 fallback、預設值或額外分支代替產品決策。

範圍外防禦檢查：通過  
未核准的新增行為：無
