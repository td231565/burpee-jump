# 波比跳日曆 Post-MVP Phase 1 Additional 實作計畫

> 狀態：已完成  
> 建立日期：2026-09-14  
> 需求依據：`PRODUCT_SPEC.md` 第 2 章、第 3.1 節、第 3.4 節、第 3.5 節、第 3.6 節（原 5.0.1、5.3.1.1、6、6.1、6.3、6.4），以及 `PRODUCT_DISCUSSIONS.md` D-011、D-014、D-031、D-032  
> 階段名稱：Post-MVP Phase 1 Additional「首頁與日曆導覽調整」，固定於 Post-MVP Phase 1 完成後、Phase 2 開始前進行

## 1. 交付目標

將目前以月曆為首屏的首頁改為兩個垂直滿版頁面，讓今日行動先於歷史紀錄：

> 開啟今日狀態首頁 → 開始今天的訓練 → 完成並保存 → 回到首頁看見今日已完成 → 向下進入日曆查看完成標記

今日已有完成紀錄時，主要操作改為「再做一次」，重新使用既有固定 Tabata 流程，但整次不新增、更新或重試任何完成紀錄。

完成條件：

- [x] 1. Phase 1 首次引導結束或回訪啟動 gate 完成後，第一個可操作首屏固定為「首頁」，不直接顯示月曆網格。
- [x] 2. 首頁顯示今日完整日期、「今日待完成」或「今日已完成」、一個對應的主要訓練按鈕，以及 Phase 1 已交付的問候、動作教學與設定入口。
- [x] 3. 完整月曆位於下方第二個滿版頁面；垂直手勢一次只移動一頁，右側兩段導覽條也可直接切換頁面。
- [x] 4. 日曆保留月份切換、回到今天、42 格月曆與日期詳情；日曆頁不再顯示今日訓練按鈕。
- [x] 5. 今日未完成時沿用既有可保存的 `/workout` 流程；今日已完成時以明確的再次訓練語意進入同一畫面。今日紀錄讀取失敗時另提供重新載入與附帶不記錄提示的直接訓練入口。
- [x] 6. 不記錄訓練沿用準備、運動、休息、音訊、暫停、繼續與取消行為，完成後直接顯示本次完成回饋，不進入保存、保存失敗或重試狀態。
- [x] 7. 不記錄訓練的開始、完成或取消皆不呼叫任何完成紀錄寫入，不覆寫既有完成時間，也不產生額外統計。
- [x] 8. 一般訓練與既有日期詳情、首次引導、教學、設定及音訊行為無回歸。

## 2. 範圍

### 2.1 納入

- 今日狀態首頁與日曆頁的資訊分層。
- 原生垂直分頁捲動與兩段側邊導覽條。
- 今日待完成／已完成狀態及對應主要操作。
- 一般每日訓練、同日再次訓練，以及今日紀錄未知時由使用者明確選擇的不記錄訓練入口。
- 完成或取消訓練後返回第一頁首頁。
- 跨午夜、跨月返回後的今日狀態與原歸屬月份月曆一致性。
- iOS／Android 的手勢、點擊區、Safe Area、大字級及螢幕閱讀器驗收。

### 2.2 不納入

- 挑戰、標準／最低完成、休息／順延、補登休息、連續天數或結算。
- 再次訓練次數、組數、秒數、完成時間、取消事件、額外日曆標記或任何統計。
- 新資料表、欄位、schema version、repository 或 migration。
- 自訂訓練秒數、休息秒數或組數。
- 新的訓練模式、單組捷徑、運動強度建議或追加訓練推薦。
- 背景／鎖屏持續計時、跨程序恢復、通知、震動、徽章或慶祝動畫。
- 橫向分頁、底部 tab bar、drawer、carousel 套件、手勢套件或全域狀態管理。
- Phase 1 首次引導、教學內容、影片發布 gate、暱稱與設定契約的重作。

## 3. 現況與可重用 seam

目前程式已具備本階段所需的資料與流程，不需要擴充持久層：

- `src/app/index.tsx` 已擁有啟動 gate、暱稱、今日完成查詢、月份查詢、教學與設定 modal，以及返回 focus 後的資料刷新。
- `src/data/completions.ts` 已提供 `getCompletionByDate`、`getCompletionsForMonth` 與冪等的 `insertCompletion`。
- `src/app/workout.tsx` 已負責畫面路由、完成紀錄寫入、保存錯誤與返回行為。
- `src/features/workout/use-tabata-timer.ts` 已擁有唯一的固定 Tabata 狀態機與音訊生命週期。
- `MonthCalendar`、`Button`、`IconButton`、`AppText`、`NatureBackdrop` 及現有 design tokens 可直接重用。
- `formatDetailDate(formatLocalDateKey(today))` 可產生首頁所需的完整今日日期，不新增重複日期 formatter。

本階段只在既有 seam 上增加頁面位置與保存策略，不建立第二套首頁、計時器或 completion repository。

## 4. 最小技術設計

### 4.1 首頁與日曆的垂直 pager

`src/app/index.tsx` 保留為唯一 index route。啟動狀態仍只有 `loading → onboarding | home`；`home` 內部再呈現一個含兩頁的原生 `ScrollView`：

```text
index route
└── vertical pager（初始 page = home）
    ├── page 0：首頁
    └── page 1：日曆
```

使用 React Native 原生 `ScrollView` 的垂直 `pagingEnabled`，關閉可見捲動條。每頁高度使用 Safe Area 內 pager 容器的實際 layout 高度，使一次手勢固定對齊一個完整頁面；不以裝置全螢幕常數推算，也不新增 carousel 或 gesture dependency。

首頁頁面包含：

- 左上方並列 `BookOpen` 動作教學與 `Settings` 設定 icon，與右上方頁面導覽分層；保留既有 44 × 44 點擊區與無障礙名稱。
- 有暱稱時在頂部控制列下方顯示既有 `Hi，{暱稱}`；沒有暱稱時不保留空間。
- 使用既有日期 formatter 顯示今日完整年月日。
- 明確文字狀態「今日待完成」或「今日已完成」；狀態不只以顏色表示。
- 單一主要按鈕：未完成為「開始今天的 2 分鐘」，已完成為「再做一次」。
- 今日完成紀錄查詢期間可先顯示首頁框架與日期，但狀態與主要按鈕維持 loading 且不可操作；不得以初始 `false` 短暫呈現「今日待完成」。

日曆頁面承接目前首頁中的月份導覽、頁首「今天」、42 格 `MonthCalendar` 與日期詳情入口：

- 月份導覽與「今天」控制位於右上方頁面導覽列下方，不與其觸控區重疊。
- 顯示目前月份時不再出現訓練按鈕。
- 顯示非目前月份時，保留日曆頁內的「回到今天」操作；它只改變日曆月份，不切換第一頁或啟動訓練。
- 月曆檢視月份保留在 `viewYear`／`viewMonth`；瀏覽、取消訓練或再次訓練不任意重設月份。一般訓練成功時則依第 4.4 節回傳的 `local_date` 對齊歸屬月份。

Phase 1 原本同列的控制會依新資訊架構拆開：動作教學與設定留在首頁，月份導覽與「今天」跟隨月曆移到第二頁。首頁不顯示月份切換或月曆網格。

不為兩頁建立通用 pager framework。若 `index.tsx` 內的兩段 JSX 影響可讀性，可各自抽成同檔案內的私有呈現元件；除非實作中出現可獨立測試的重複行為，否則不新增通用 component 檔。

### 4.2 右側兩段導覽條

導覽條以絕對定位放在 pager 右上方安全區內，位於月曆網格上方的非互動區域，不參與或壓縮月曆網格的水平 layout。視覺 icon 初始為 20px，實際各自包含至少 44 × 44 的 `Pressable`：

```text
Home icon      首頁（第 1 頁／共 2 頁）
Calendar icon  日曆（第 2 頁／共 2 頁）
```

畫面只顯示既有 Lucide 系統的首頁與日曆 icon，不新增頁面底部滑動文字提示；無障礙語意仍須完整：

- 每段提供頁面名稱、頁碼與總頁數。
- 當前頁使用 `accessibilityState.selected = true`，並以 icon 容器形狀或粗細搭配顏色呈現選取狀態，不只依賴顏色；label 同時表達目前頁面。
- 點擊後呼叫 pager ref 的 `scrollTo` 對齊目標頁，並同步目前頁狀態。
- 手勢分頁完成後，依垂直 offset 更新目前頁狀態。
- 只有目前頁內容及兩個導覽按鈕進入無障礙樹；非目前頁在 iOS 使用 `accessibilityElementsHidden`、Android 使用 `importantForAccessibility="no-hide-descendants"` 排除。
- 切頁完成後使用 `AccessibilityInfo` 宣告頁面名稱、頁碼與總頁數，不預設同時強制移動焦點；實機驗收若發現焦點停在不可見內容，再加入平台限定的焦點修正。
- 初次進入、首次引導結束及 index route 重新掛載時都選中首頁；單純 App 前景／背景切換不強制改頁。

導覽條不得遮住首頁左上方的動作教學與設定、首頁主要按鈕、其下方的日曆月份控制、日期格或 modal。20px icon 是待實機確認的初始視覺值，可依 iOS／Android 畫面比例微調，但 44 × 44 觸控區與月曆完整寬度是固定驗收條件。教學與設定 modal 開啟時由 modal 自身接管互動，關閉後保留原頁位置。

### 4.3 今日狀態與資料刷新

沿用 `useFocusEffect`，每次 index route 重新取得 focus 時：

1. 以當下 `new Date()` 重新推導 `currentKey` 與 `todayDate`。
2. 查詢 `getCompletionByDate(db, currentKey)` 更新首頁今日狀態。
3. 依現有 `viewYear`／`viewMonth` 查詢第二頁月曆紀錄。
4. 沿用既有音訊偏好刷新。

今日狀態使用 `loading → pending | completed | unavailable`，不再以 `boolean` 初始值把「尚未查詢」混同「查無紀錄」。首次進入首頁及當地日改變後，狀態與主要操作先維持 loading；只有 `getCompletionByDate` 成功回傳後才進入 `pending` 或 `completed`。

今日紀錄、月曆紀錄與音訊偏好各自發出查詢及處理結果，不使用 `Promise.all`。今日紀錄初次讀取失敗時進入 `unavailable`，顯示「暫時無法讀取今日紀錄」、主要按鈕「重新載入」、次要按鈕「開始訓練」，並在次要操作附近顯示「目前無法確認今天是否已有紀錄。若直接開始，本次訓練不會被記錄。」重新載入只重試今日紀錄；直接開始則進入不記錄訓練。

同一 `currentKey` 已有可信 `pending` 或 `completed` 狀態時，後續刷新失敗維持最後已知狀態。`currentKey` 改變時不得沿用前一日狀態，先回到 `loading`，失敗時再進入 `unavailable`。

月曆資料以目前 `viewYear`／`viewMonth` 為鍵使用 `loading | ready | unavailable`。月份切換先進入 `loading`；月份標題、上一月、下一月與「回到今天」仍可操作，42 格網格維持原 layout，但以 overlay 暫停日期格 pointer event，並將網格排除於無障礙樹。該月沒有可信資料且查詢失敗時進入 `unavailable`，顯示「暫時無法讀取月曆紀錄」及「重新載入」；若同月已有可信資料，刷新失敗保留標記並顯示非阻擋小型錯誤提示。只保留目前月份資料，不新增多月份 cache。

音訊偏好讀取獨立處理。`workout.tsx` 每次進入仍自行讀取最新偏好；讀取失敗時本次以三項全關閉的偏好初始化 timer，不顯示 banner、toast 或文字提示，不阻擋計時或完成紀錄，也不將降級值寫回資料庫。音訊資源本身載入或播放失敗仍沿用既有 `isAudioDegraded` 提示規則。

`useFocusEffect` 繼續處理 route 返回後的刷新；另以 `AppState` 監聽 index route 停留期間從背景回到 `active`。前景恢復時先比較 `formatLocalDateKey(new Date())` 與目前 `currentKey`：相同則不發出任何查詢，不同才將今日狀態設為 `loading`，並分別刷新今日紀錄、目前 `viewYear`／`viewMonth` 的月曆紀錄及音訊偏好。這項刷新不得改變 pager 目前頁或日曆檢視月份。

不新增 cache、event bus 或 global store，也不增加資料修正。

跨午夜完成時，首頁依完成後當下的新當地日查詢狀態；若新日尚無紀錄，顯示「今日待完成」與「開始今天的 2 分鐘」。一般訓練成功時另以鎖定的 `local_date` 將第二頁對齊歸屬月份並重新查詢該月紀錄，不把前一日紀錄誤歸到新日。

### 4.4 一般訓練與不記錄訓練路由契約

沿用 `/workout` route，只增加一個內部 route param 表達保存策略：

```text
今日待完成             → /workout                       → recordCompletion = true
今日已完成／再做一次   → /workout?mode=unrecorded       → recordCompletion = false
今日紀錄未知／開始訓練 → /workout?mode=unrecorded       → recordCompletion = false
```

`workout.tsx` 使用 `useLocalSearchParams` 讀取 `mode=unrecorded`，再將 `recordCompletion = false` 傳給既有 `useTabataTimer`。再次訓練與今日紀錄未知時的直接訓練是不同產品情境，但共用相同保存策略。

模式在進入 workout route 時固定。若使用者以 `mode=unrecorded` 進入後停在 ready 畫面跨越午夜，才按下「開始」，本次仍不保存；不得在 `start()` 時依新日期靜默改成一般訓練。返回首頁後，再由新當地日的完成紀錄決定主要操作。

Workout route 不再次查詢資料庫判斷入口情境；正常 UI 已由首頁決定保存策略。未知或缺少 mode 時沿用一般可保存流程。

一般訓練保存成功後，`workout.tsx` 使用目前 Expo Router 已提供的 `dismissTo` 返回 `/`，並以內部 param 回傳 timer 已鎖定的 `local_date`。`index.tsx` 收到後維持首頁、將第二頁月曆的 `viewYear`／`viewMonth` 對齊該歸屬日，並重新查詢今日及歸屬月份資料；不得直接以回傳資料樂觀標記完成。返回前的 `pending` 已可能過時，因此重新查詢失敗時進入 `unavailable` 錯誤流程，不保留舊的待完成狀態。這項回傳不能只以「進入 workout 前的目前月份」取代，因為正常流程允許使用者停在 ready 畫面跨日後才按開始；真正歸屬日只在 timer `start()` 時鎖定。

取消訓練與不記錄訓練沒有新完成紀錄，沿用 `router.back()` 返回，不傳 `local_date`，也不改變原本瀏覽的月曆月份。

### 4.5 唯一 Tabata 狀態機的保存策略

`useTabataTimer` 增加最小選項 `recordCompletion?: boolean`，預設 `true`，確保所有既有呼叫與測試維持一般訓練語意。

固定計時、日期鎖定、音訊事件、AppState 暫停、取消及 Keep Awake 完全共用；只有完成 113 秒後的狀態轉移不同：

```text
一般訓練：FINISH → saving → completed | saveError → retry/discard
不記錄訓練：FINISH → completed
```

不記錄訓練完成時 `saveRecord` 必須為 `null`，不先進入一個假的 `saving` 狀態，也不以呼叫 `markSaveSuccess()` 偽裝保存成功。`workout.tsx` 的 SQLite effect 因此只可能在一般訓練的 `saving + saveRecord` 狀態執行。

完成畫面依模式呈現不同語意：

- 一般訓練保留「已完成並記錄」語意及既有保存失敗／重試閉環。
- 不記錄訓練保留「訓練完成！」標題，內容只表達本次完成，例如「本次訓練已完成」，不得出現「已記錄」、日期、次數或統計。
- 返回與頁首離開操作使用「返回首頁」語意；一般完成會同時回傳鎖定的 `local_date`，不記錄訓練與取消只返回原 index。

不修改 `daily_completions` 的 `ON CONFLICT DO NOTHING`。冪等性仍只服務一般訓練的同一次保存重試，不用它承接不記錄訓練。

### 4.6 無障礙與版面

- 首頁狀態必須有可見文字，不以完成綠或其他顏色單獨傳達。
- 兩個導覽段、教學、設定、月份控制及主要操作的觸控區至少 44 × 44。
- 導覽段以 button role、selected state、頁面名稱、目前位置與總頁數供 VoiceOver／TalkBack 宣告。
- 非目前頁排除於螢幕閱讀器導覽；切頁後只宣告一次新頁位置，不同時重複移動焦點。
- 垂直手勢與導覽條提供同等功能；不要求使用者只能精準拖曳。
- 大字級下不截斷問候、日期、狀態或主要按鈕文字；使用 flex 與既有 spacing 調整，不建立內層垂直 carousel。
- 背景延續現有 `NatureBackdrop`，不新增插畫、動畫、陰影層或 design token。

## 5. 預計檔案

```text
src/
├── app/
│   ├── index.tsx                         # 兩頁 pager、今日狀態、側邊導覽與完成歸屬日
│   └── workout.tsx                       # 解析 unrecorded mode、模式化完成文案與返回契約
├── features/
│   └── workout/
│       └── use-tabata-timer.ts           # recordCompletion 與完成狀態轉移
└── features/settings/components/
    └── settings-modal.tsx                # 個人資料／音訊偏好 allSettled 與部分失敗呈現

__tests__/
├── index.test.tsx                         # 首頁／日曆分層、導覽、今日狀態與跨日刷新
├── settings-modal.test.tsx                # 共用 loading 與兩區部分成功／失敗
├── workout.test.tsx                       # 一般保存與不記錄訓練
└── use-tabata-timer.test.ts               # 兩種完成狀態機
```

預設不修改：

- `src/data/database.ts`、`src/data/completions.ts` 與任何 schema。
- `MonthCalendar`、日期詳情、onboarding、tutorial 或 audio service；settings 只修改上述直接需求。
- `package.json` 與 `bun.lock`。

若實作證明上述未修改檔存在直接缺口，必須先指出具體規格與正常 UI 觸發情境，再將它加入範圍；不可為目錄整齊或未來 Phase 預先調整。

## 6. TDD 實作切片

每個 slice 只測公開行為：可見文字、role、無障礙狀態、使用者操作、route 參數、repository 是否被呼叫，以及 timer 對外狀態。不斷言私有 state、component tree 形狀或內部 reducer action。

### Slice 0：鎖定既有一般訓練契約

目的：在加入模式前，以現有測試確認一般 `/workout` 仍會保存並保留錯誤重試流程。

驗收：

- [x] 未帶 mode 時完整訓練進入 `saving`，保存成功後才 `completed`。
- [x] 保存失敗仍提供「重新儲存」與「放棄紀錄」。
- [x] 日期鎖定、跨午夜歸屬、音訊、暫停與取消測試維持通過。

### Slice 1：今日狀態首頁

先更新 `index.test.tsx` 形成 red test，再重排 `index.tsx`：

- [x] 啟動 gate 後目前頁為「首頁，第 1 頁，共 2 頁」。
- [x] 今日完成紀錄尚未回傳時，不顯示「今日待完成」或「今日已完成」，訓練主要操作不可用。
- [x] 首頁顯示完整今日日期與「今日待完成」。
- [x] 今日紀錄、月曆紀錄與音訊偏好獨立查詢；任一失敗不阻斷另外兩項更新。
- [x] 今日紀錄初次查詢失敗時顯示錯誤說明、「重新載入」與「開始訓練」；後者附近明確提示本次不記錄並以 `mode=unrecorded` 開啟 workout。
- [x] 同日已有可信狀態後刷新失敗時保留該狀態；跨日後不得沿用前一日狀態。
- [x] 今日未完成只顯示一個「開始今天的 2 分鐘」主要操作，按下後以一般模式開啟 `/workout`。
- [x] 今日已完成顯示「今日已完成」與可操作的「再做一次」，不再顯示停用的「今天完成了」。
- [x] 首頁保留有條件問候、動作教學與設定，不顯示月份切換控制。

### Slice 2：第二頁日曆與兩種導覽

- [x] 向上滑動／分頁完成後，導覽狀態更新為「日曆，第 2 頁，共 2 頁」。
- [x] 點擊「日曆」段會對齊第二頁；點擊「首頁」段會回到第一頁。
- [x] 每段觸控區至少 44 × 44，當前段具有 selected state。
- [x] 第二頁保留上一月、下一月、今天、42 格月曆與日期詳情。
- [x] 月份切換時保留網格 layout 並顯示 loading overlay；日期格暫停互動與朗讀。初次失敗顯示月曆錯誤與重新載入，同月已有資料時刷新失敗保留標記。
- [x] 目前月份的日曆頁不出現訓練主要操作；非目前月份仍出現「回到今天」，且只改變月份。
- [x] 日期詳情 modal 關閉後仍回到日曆頁，不重設為首頁。

Jest 不模擬真實慣性物理；自動測試以 scroll completion event 與可存取導覽按鈕驗證狀態同步，實際吸附與手勢距離留給 Slice 6 雙平台裝置驗收。

### Slice 3：不記錄訓練的 Tabata 完成狀態

在 `use-tabata-timer.test.ts` 先加入 `recordCompletion: false` 的 red test：

- [x] 開始、準備、運動、休息、暫停、繼續及取消與一般模式相同。
- [x] 完整 113 秒後直接進入 `completed`。
- [x] `saveRecord === null`，不經過 `saving` 或 `saveError`。
- [x] 預設未傳選項仍走既有一般保存狀態。

只修改 FINISH 的保存分流，不複製 timer hook、stage 設定或 audio service。

### Slice 4：首頁至不記錄訓練的端到端 UI seam

- [x] 首頁今日已完成時按下「再做一次」，以及今日紀錄未知時按下「開始訓練」，都以 `{ pathname: '/workout', params: { mode: 'unrecorded' } }` 導航。
- [x] `workout.tsx` 收到 unrecorded mode 後仍顯示相同固定流程並可完整執行。
- [x] 不記錄訓練完成時 `insertCompletion`／SQLite `runAsync` 呼叫次數為 0。
- [x] 畫面不顯示「正在保存紀錄」、「儲存失敗」、「重新儲存」、「已記錄」或「放棄紀錄」。
- [x] 完成畫面只顯示本次完成回饋；按下「返回首頁」後返回 index。
- [x] 未帶 mode 的一般訓練保存成功與保存失敗測試繼續通過。

### Slice 5：返回 focus 與日期邊界

- [x] 一般訓練保存後以鎖定 `local_date` 返回 index；首頁不樂觀更新，重新查詢成功後顯示對應今日狀態，第二頁對齊並重新查詢該紀錄的歸屬月份；今日查詢失敗時進入 `unavailable` 錯誤流程。
- [x] 再次訓練返回後仍顯示同一完成狀態，資料庫內容與首次完成時間未變；今日紀錄未知時的不記錄訓練返回後重新載入今日狀態，不推定完成。
- [x] 1/31 進入 workout、停到 2/1 才按開始時，寫入並回傳 2/1；不得以進入畫面的日期預先決定月份。
- [x] 1/31 按開始、2/1 完成的一般訓練仍寫入並回傳 1/31；返回首頁後，新當地日 2/1 未完成時顯示「開始今天的 2 分鐘」。
- [x] 已完成日 1/31 以再次訓練進入 workout、停到 2/1 才按開始時，本次仍不保存；返回首頁後，2/1 未完成時顯示「開始今天的 2 分鐘」。
- [x] 第二頁月曆仍停在 1 月並顯示 1/31 完成標記；不自動把紀錄搬到 2 月。
- [x] index route 初次掛載落在首頁；App 前景切換與 modal 關閉不重設使用者正在查看的頁面。
- [x] index route 停留期間回到前景時，當地日期未變不刷新；日期改變才刷新三項獨立資料，且不改變頁面或日曆檢視月份。

### Slice 6：iOS／Android 裝置驗收

- [x] 全新安裝完成 Phase 1 首次引導後落在首頁，不閃現月曆。
- [x] 回訪開啟 App 也以首頁為第一頁。
- [x] 手指向上滑一次只到日曆，手指向下滑一次只回首頁；停止時不懸在兩頁中間。
- [x] 點擊兩段導覽條可正確移動，44 × 44 觸控區不與鄰近控制互相誤觸。
- [x] 右上方導覽列不壓縮或遮擋月曆網格；20px icon 在雙平台小尺寸裝置上仍清楚可辨，必要時只調整 icon 視覺尺寸。
- [x] VoiceOver／TalkBack 正確宣告首頁／日曆、目前頁、頁碼與共兩頁。
- [x] 小尺寸裝置與最大常用系統字級下，今日日期、狀態、主要按鈕、月份控制及日曆仍可操作。
- [x] 一般訓練完成確實新增當日紀錄；再次訓練與今日紀錄未知時的不記錄訓練，無論完整跑完、取消或背景暫停均不改變資料。
- [x] 跨午夜測試符合 Slice 5 的首頁與月曆結果。

## 7. 自動驗證

每個 slice 的最小檢查：

```sh
bun run test -- <相關測試檔> --runInBand
```

完整 Phase 驗證：

```sh
bun run typecheck
bun run lint
bun run test -- --runInBand
```

驗證時同時確認 `git diff` 只包含本計畫列出的檔案與直接需求變更；不格式化或重構無關檔案。

## 8. 已確認的實作規則

- 首頁與日曆仍是同一 index route，不增加 tab、drawer 或 nested router。
- 初次可操作頁固定為首頁；日曆是同 route 下方第二個滿版頁面。
- 今日主要操作只存在首頁，與日曆正在查看的月份無關。
- 日曆的「回到今天」只切換日曆月份，不取代首頁訓練操作。
- 一般訓練成功後以 timer 鎖定的 `local_date` 對齊第二頁歸屬月份；取消與不記錄訓練不改變月曆月份。
- 不記錄訓練是保存策略不同的同一固定 Tabata，不是新動作、新時長或單組模式；再次訓練是其中一種入口情境。
- 不記錄訓練不以冪等 insert 取巧；從狀態機起即不產生保存資料或保存狀態。
- Workout route 信任首頁產生的 mode，不增加重複資格查詢、錯誤頁或自動模式修正。
- 一般訓練的第一次完成時間、保存重試與錯誤確認契約不變。
- 不新增依賴、資料模型、分析事件、後端、同步或 Phase 2 預建抽象。

## 9. Phase 1 Additional Done 定義

- [x] Slice 0–6 全部通過。
- [x] TypeScript、lint 與完整 Jest 測試通過。
- [x] iOS／Android 垂直吸附、側邊導覽及無障礙裝置驗收通過。
- [x] 一般「訓練 → 保存 → 首頁狀態 → 日曆標記」閉環無回歸。
- [x] 所有不記錄訓練的完成、取消、暫停與返回路徑皆無任何資料庫寫入。
- [x] Phase 1 的首次引導、問候、教學與設定行為無回歸。
- [x] 沒有 Phase 2 資料欄位、服務、UI 或抽象。
- [x] 範圍外防禦檢查：通過。
- [x] 未核准的新增行為：無。
