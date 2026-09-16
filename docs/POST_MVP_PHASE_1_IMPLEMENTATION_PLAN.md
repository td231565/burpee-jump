# 波比跳日曆 Post-MVP Phase 1 實作計畫

> 狀態：已實作完成；正式影片仍有發布前待決策項目
> 建立日期：2026-09-11  
> 需求依據：`PRODUCT_SPEC.md` 5.0.1、5.1.1、6.1、7.1、7.4、7.5，以及 `PRODUCT_DISCUSSIONS.md` D-010、D-051、D-052  
> 階段名稱：Post-MVP Phase 1「首次引導與教學」，不等同於 `IMPLEMENTATION_PLAN.md` 的 MVP 技術 Phase 1

## 1. 交付目標

在不改變既有日曆與 Tabata 閉環的前提下，加入一次性的首次引導：

> 首次開啟 → 顯示暱稱步驟並觸發呈現標記 → 輸入或略過暱稱 → 顯示完整教學與安全提醒 → 進入首頁

後續開啟 App 直接進入首頁；使用者仍可從首頁的「動作教學」icon 重新開啟相同教學內容。App 尚未發布，因此本階段沒有既有使用者升級後略過首次引導的產品情境。

完成條件：

- [x] 1. 本次安裝尚未呈現過首次引導時，不先暴露可操作的首頁；暱稱步驟實際掛載後觸發一次性的呈現標記寫入，成功後不再自動顯示。
- [x] 2. 暱稱與 `onboarding_presented` 分別寫入 `user_profile` 與 `onboarding_state`；兩者互不推導，暱稱可以略過。
- [x] 3. 點擊「我知道了」或關閉教學時直接進入首頁，不再修改引導標記。
- [x] 4. 已呈現過首次引導的使用者重新開啟 App 時直接進入首頁；有暱稱才顯示「Hi，{暱稱}」，沒有暱稱則完全不顯示歡迎詞。
- [x] 5. 首頁使用 Lucide `BookOpen`（24 px、2 px stroke）提供至少 44 × 44、無障礙標籤為「動作教學」的常駐 icon button；操作列順序固定為「今天 → 動作教學 → 設定」。
- [x] 6. 從首頁重新開啟教學時，關閉後保留原本檢視月份與首頁狀態。
- [x] 7. 開發版本不載入影片播放器或發出影片請求；沒有影片時仍能完成引導。

`onboarding_presented` 只表示首次引導的暱稱步驟曾實際掛載，不表示使用者已輸入暱稱、看過完整教學、按下「我知道了」、完整閱讀或同意其中內容。按下「我知道了」或離開只結束當次記憶體流程。

## 2. 範圍

### 2.1 納入

- 首次啟動時的資料載入 gate，避免首頁先短暫顯示再跳出引導。
- 暱稱輸入頁與規格已定稿的標題、說明、placeholder、按鈕文案。
- App 宗旨、動作宣導、安全提醒及完成按鈕。
- 固定比例的「教學影片準備中」佔位區。
- SQLite 以獨立單列資料表保存可選暱稱與 `onboarding_presented`。
- 首頁只在暱稱存在時顯示「Hi，{暱稱}」問候。
- 首頁既有「設定」入口擴充為一般設定 modal，內含可新增或修改暱稱的「個人資料」區域與既有「音訊」區域。
- 首頁常駐教學入口與可捲動教學 modal。
- iOS／Android 的鍵盤、捲動、系統返回鍵、Safe Area、大字級及螢幕閱讀器驗收。
- 可略過暱稱；有輸入時執行 trim、接受任何語言字元集，並以 React Native 原生 `maxLength={20}` 限制長度。

### 2.2 不納入

- 身高、出生年、健康史或其他個人資料。
- 依暱稱或個人資料推薦訓練強度。
- 標準／降級動作選擇、實際動作類型紀錄或漸進課表。
- 尚未確認的其他個人資料欄位、空白控制項或通用 profile schema。
- YouTube Player、第三方影片請求、影片下載、剪輯或重新託管。
- 帳號、後端、同步、分析 SDK 或 onboarding 成效事件。
- 挑戰、最低完成、休息、通知、動畫與其他 Post-MVP Phase 2 之後的資料或抽象。

## 3. 最小技術設計

### 3.1 依賴與 UI

不新增套件。使用 React Native 既有的 `Modal`、`ScrollView`、`TextInput`、`KeyboardAvoidingView` 與目前專案的 `AppText`、`Button`、`IconButton`、design tokens。

教學內容只維護一份，由首次引導與首頁重開共用，但不共用呈現外殼：

- 首次引導：在 `index.tsx` 的啟動狀態中直接渲染全螢幕 onboarding screen；兩個步驟右上角都有明確關閉鍵。暱稱標示為選填，「繼續」永遠可按；空值不寫入並進入教學，有值才保存。Android 系統返回鍵在兩步都等同關閉並直接進首頁。沒有獨立「略過」按鈕、確認對話框或遮罩點擊關閉。
- 首頁重開：使用 React Native `Modal` 直接顯示共用教學內容；右上角關閉鍵、底部「關閉」、Android 返回鍵或遮罩都只關閉 modal。

`TutorialContent` 只包含影片佔位與教學文字，不包含流程按鈕。首次引導外殼在底部顯示「我知道了」，首頁重開 modal 的底部按鈕則顯示「關閉」，避免把重新閱讀誤稱為再次完成引導。

首頁沿用單一「設定」入口，將既有標題為「音訊設定」的 modal 擴充為標題「設定」的一般設定 modal；「個人資料」與「音訊」為其中兩個區域。首頁只為規格要求的「動作教學」增加獨立 icon，不另加個人資料 icon。

設定 modal 使用原生 `KeyboardAvoidingView` 與 `ScrollView`，不新增鍵盤或 bottom-sheet 套件。標題及右上角關閉鍵固定可見，內容高度受 Safe Area 限制；鍵盤開啟時仍可捲到暱稱欄位與「更新暱稱」。大字級時欄位、按鈕與音訊列可垂直增高，不固定 row 高度。點擊 modal 內部不關閉，只有遮罩、關閉鍵或 Android 返回鍵關閉。

每次開啟設定 modal 時重新讀取個人資料。讀取進行中維持 modal、標題、關閉鍵與所有欄位原本版面，在內容上覆蓋半透明 loading 層及置中 spinner；個人資料與音訊控制項都看得到但不可互動，因此讀取結果不會覆蓋使用者草稿。Spinner 的無障礙名稱為「正在讀取個人資料」，不顯示對應可見文字；loading 期間下方內容暫時排除於螢幕閱讀器導覽。右上角關閉、外層遮罩與 Android 返回鍵仍可關閉 modal。關閉後忽略尚未完成的結果，避免晚到的請求更新已關閉或再次開啟的 modal。讀取完成後只移除 loading 覆蓋層。讀取失敗時仍完整顯示「個人資料」與「音訊」區域及其中欄位，不隱藏任何區域；以 modal 內短暫 toast/banner 顯示「個人資料讀取失敗」，約 4 秒後自動消失，以 polite live region 宣告且不阻擋操作。不提供專用重新讀取按鈕，下一次關閉再開 modal 時自然重試，也不新增 toast 套件。暱稱欄位顯示記憶體中最後已知的值，從未成功讀取時顯示空白，並維持可編輯。只有使用者實際修改內容後才啟用「更新暱稱」；在未知持久值且欄位仍為預設空白時不得視為清除操作，使用者主動輸入新暱稱後仍可嘗試保存。

「個人資料」區域的暱稱輸入框下方緊接次要樣式的「更新暱稱」按鈕，只在正規化後內容與目前保存值不同時啟用；既有暱稱可清空並更新為 null。按鈕只提交暱稱，不使用可能涵蓋整個 modal 的「儲存」或「套用」文案；窄螢幕或大字級時移至輸入框正下方並佔滿該區寬度。Modal 不設共同提交按鈕。既有音訊開關仍在「音訊」區域內切換即保存，但不額外顯示保存時機說明。

暱稱寫入失敗時保留輸入內容，並在輸入框下方顯示「暱稱未能儲存，請再試一次」；首次引導停留在暱稱步驟，設定 modal 不更新首頁問候。操作按鈕恢復可用，讓使用者手動重試；不自動重試、不關閉 modal，也不加入 fallback。

從設定更新暱稱成功後，modal 保持開啟，立即更新記憶體中的暱稱；「更新暱稱」因內容已無變更而停用，按鈕下方顯示「暱稱已更新」，並以 polite live region 宣告。使用者再次編輯時移除成功訊息；自行關閉設定後，首頁顯示新問候。

設定中的暱稱草稿只代表尚未提交的使用者意圖。使用者透過遮罩、右上角關閉或 Android 返回鍵離開時，未按「更新暱稱」的草稿直接捨棄且不顯示確認；下次開啟重新使用持久值。音訊開關已即時保存的變更不回滾，也不因暱稱草稿而延後。

不建立 navigation route、global store、表單 framework、通用 onboarding engine 或遠端內容設定。

### 3.2 資料模型

發布前資料庫基線更新為 schema version 2，為目前已存在的兩個概念新增各自的單列資料表：

```sql
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  nickname TEXT
);

CREATE TABLE IF NOT EXISTS onboarding_state (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  onboarding_presented INTEGER NOT NULL DEFAULT 0
    CHECK (onboarding_presented IN (0, 1))
);
```

初始化時分別插入 `user_profile(id = 1, nickname = NULL)` 與 `onboarding_state(id = 1, onboarding_presented = 0)`。既有 `daily_completions` 與 `audio_preferences` 不變。

新增兩個各自擁有單一概念的 repository seam，只公開實際需要的 interface：

```ts
export interface UserProfile {
  nickname: string | null;
}

getUserProfile(db): Promise<UserProfile>
updateNickname(db, nickname: string | null): Promise<void>

hasPresentedOnboarding(db): Promise<boolean>
markOnboardingPresented(db): Promise<void>
```

`src/data/profile.ts` 擁有暱稱讀寫，`src/data/onboarding.ts` 擁有本次安裝是否已呈現首次引導的布林標記。`updateNickname` 接受字串或 null；字串先移除前後空白，trim 後為空時保存 null，內部空白與任何語言字元保持原樣。首次引導通常由 null 開始，空白時不需呼叫 `updateNickname`；若呈現標記曾失敗而再次顯示引導，則預填已讀取的既有暱稱，內容未修改時不重複寫入。使用者清空預填值再繼續時視為明確移除，以 null 更新；寫入失敗則停留並保留草稿。設定中清空既有暱稱同樣以 null 更新。首次引導與設定輸入框都使用原生 `maxLength={20}`，不建立 Unicode grapheme 分割邏輯。`markOnboardingPresented` 只將標記設為 true，沒有內容版本或重設能力。Phase 1 不在 `user_profile` 預建未來欄位，不建立泛用 key-value settings table，也不為未來版本預建 migration framework。

首次判斷為尚未呈現時，畫面立即進入 onboarding；暱稱步驟實際掛載後，由一次性的 effect 非阻擋地呼叫 `markOnboardingPresented`。不在畫面切換前預先寫入。寫入失敗不阻擋、不顯示錯誤，也不建立重試機制；若 App 在 effect 執行前終止，或寫入失敗，下次啟動可能再顯示一次。

### 3.3 畫面狀態

`src/app/index.tsx` 在 SQLite 初始化後讀取 onboarding 狀態，將啟動狀態限制為：

```text
loading
  → onboarding:nickname
  → onboarding:tutorial
  → home（「我知道了」或關閉教學）

loading
  → home（首次引導已呈現）

loading
  → home（啟動讀取失敗；隱藏問候與首次引導）

home
  ↔ tutorial（由首頁 icon 開啟／關閉）
```

`loading` 畫面沿用首頁背景，只顯示置中的 loading 指示器，不顯示「載入中」或其他可見文字，也不渲染月曆、問候或可操作按鈕。指示器的無障礙名稱為「載入中」，供 VoiceOver／TalkBack 宣告。

首次引導完成與首頁主體沿用同一個 `HomeScreen`，不新增 route。既有月份、完成紀錄與音訊偏好仍由目前首頁流程管理。

SQLite 成功開啟並初始化後，若只在啟動時讀取 `onboarding_presented` 或個人資料失敗，畫面無提示地降級至首頁；當次不顯示問候或首次引導，也不因失敗寫入、重試或清除資料。這項降級只影響 Phase 1 個人化與引導功能，日曆及訓練核心操作維持可用。

若 SQLite 資料庫本身無法開啟或 `initializeDatabase` 失敗，則不能視為可正常操作：Root layout 顯示阻擋式訊息「資料載入失敗，請重新開啟 App」，不渲染首頁、首次引導或其他依賴資料庫的 route，也不自動重試或清除資料。

首次引導的暱稱步驟掛載後，以一次性 effect 持久化 `onboarding_presented = 1`，之後步驟只存在記憶體。標記成功後，若 App 在暱稱或教學步驟被強制終止，下次直接進入首頁；暱稱是否已保存不影響這項判斷。若 App 在 effect 執行或寫入成功前終止，則接受下次再顯示一次引導。

## 4. 預計檔案

```text
src/
├── app/
│   ├── _layout.tsx                            # SQLite 初始化失敗畫面
│   └── index.tsx                              # 啟動 gate、問候、教學與設定入口
├── data/
│   ├── database.ts                           # schema version 2 基線
│   ├── onboarding.ts                         # 引導呈現標記 repository
│   └── profile.ts                            # 暱稱 repository
└── features/
    ├── onboarding/
    │   └── components/
    │       ├── onboarding-screen.tsx          # 全螢幕暱稱／首次教學流程
    │       └── tutorial-content.tsx           # 首次與重開共用內容
    └── settings/
        └── components/
            └── settings-modal.tsx             # 個人資料與既有音訊設定（取代原 audio-settings-modal.tsx）

__tests__/
├── onboarding.test.ts                         # 引導呈現標記 repository
├── profile.test.ts                            # 暱稱 repository 與初始化冪等性
├── onboarding-screen.test.tsx                 # 公開互動與內容
├── settings-modal.test.tsx                    # 暱稱編輯與既有音訊設定（遷移並取代原 audio-settings-modal.test.tsx）
└── index.test.tsx                             # 首次／回訪首頁整合與既有測試相容更新
```

清理與遷移項目：
- 既有 `src/features/calendar/components/audio-settings-modal.tsx` 擴充重構為 `src/features/settings/components/settings-modal.tsx`，遷移完成後刪除舊檔。
- 既有 `__tests__/audio-settings-modal.test.tsx` 遷移整併至 `__tests__/settings-modal.test.tsx`，驗證無誤後刪除舊檔。

若實作時兩個 onboarding component 合併後更短且仍能共用教學內容，允許保留單一檔案；不為符合目錄圖建立空抽象。

## 5. TDD 實作切片

沿用 MVP 計畫的 repository seam 與畫面公開互動 seam。每次只完成一個 red → green 行為，再執行相關測試；切片完成後跑完整驗證。

### [x] Slice 0：Onboarding 資料基線

行為：以發布前 schema version 2 基線初始化資料庫後，可分別讀取空白個人資料與預設為尚未呈現的 onboarding 狀態。

最少變更：

- [x] 將 `initializeDatabase` 的發布前基線設為 version 2。
- [x] 新增 `user_profile`、`onboarding_state` 與各自的 repository。
- [x] 加入全新資料庫初始化及重複初始化的測試。

驗收：

- [x] `nickname === null`。
- [x] `onboardingPresented === false`。
- [x] 再次初始化不在任一資料表新增第二列或失敗。
- [x] 不承諾或測試未發布 schema version 1 的資料保存與 migration 行為；開發裝置可清除 App 資料後重建。

### [x] Slice 1：首次開啟先詢問暱稱

行為：`onboarding_presented === false` 時，啟動載入完成後顯示「想怎麼稱呼你？」；該步驟實際掛載後才觸發一次性的非阻擋呈現標記寫入。首頁操作在此時不可互動。使用者可輸入暱稱或略過。

最少變更：

- [x] 在首頁讀取 onboarding 狀態並加入 `loading` gate。
- [x] 在 `src/app/_layout.tsx` 處理 SQLite 開啟或初始化失敗狀態，渲染阻擋式訊息「資料載入失敗，請重新開啟 App」（建議拆分為可獨立測試之錯誤呈現元件）。
- [x] 更新 `__tests__/index.test.tsx` 的 mock 設定，為 `hasPresentedOnboarding` 與 `getUserProfile` 提供預設回傳（如已呈現、無暱稱），確保首頁既有測試不因啟動 gate 阻塞中斷。
- [x] 直接渲染全螢幕暱稱步驟及「繼續」，不在首頁上疊 modal。
- [x] 將欄位標示為「暱稱（選填）」；「繼續」永遠可按，不另設「略過」按鈕。
- [x] 空值或只有空白時不寫入並直接進入教學；有輸入時 trim 前後空白，任何語言字元及名稱中間的空白原樣保留，輸入框限制 20 個原生長度單位並顯示「最多 20 個字元」。
- [x] 若呈現標記曾寫入失敗而引導再次出現，且啟動時已讀到既有暱稱，則預填該值；未修改直接繼續時不重複寫入，修改後才保存。
- [x] 清空預填暱稱再繼續時保存 null；若移除寫入失敗，停留在暱稱步驟並保留空白草稿及既有持久值。
- [x] 暱稱步驟實際掛載後，以一次性 effect 呼叫 `markOnboardingPresented`；不在畫面切換前預先寫入。保存暱稱或略過後切換到教學，不再修改 onboarding 標記，也不保存目前步驟。

驗收：

- [x] 首次載入不閃現可操作的日曆首頁。
- [x] 啟動 gate 只顯示首頁同款背景及置中 loading 指示器，不顯示可見文字或首頁控制項；指示器的無障礙名稱為「載入中」。
- [x] 啟動讀取 onboarding 狀態或個人資料失敗時，無提示地顯示可操作首頁；不顯示問候或引導，不自動重試、寫入或清除資料。
- [x] SQLite 開啟或初始化失敗時只顯示「資料載入失敗，請重新開啟 App」，不顯示首頁或引導，也不自動重試或清除資料。
- [x] 暱稱成功保存後顯示教學。
- [x] `「  小 明  」` 保存及顯示為 `「小 明」`；非拉丁字母暱稱可正常保存與顯示。
- [x] 空值或只有空白的輸入不寫入暱稱，仍可繼續進入教學。
- [x] 再次出現引導且已有暱稱時顯示預填值；未修改直接繼續不呼叫暱稱更新。
- [x] 清空預填暱稱並繼續會移除持久值；寫入失敗時不進入教學。
- [x] 暱稱頁與教學頁都有明確關閉鍵，可直接進入首頁；暱稱頁未保存的輸入在關閉時捨棄。
- [x] 寫入失敗時保留輸入並顯示「暱稱未能儲存，請再試一次」，不進入教學；使用者可手動重試。
- [x] 暱稱步驟掛載並完成 effect 寫入後，資料庫中的 `onboarding_presented` 為 true。
- [x] 模擬 App 在暱稱步驟掛載前終止時，不得預先寫入呈現標記；掛載後 effect 只觸發一次。
- [x] 模擬呈現標記寫入失敗時，當次仍顯示並可完成引導，不顯示錯誤或啟動重試。
- [x] 不出現身高、出生年、動作版本或強度選項。

### [x] Slice 2：離開首次教學

行為：教學步驟顯示規格已定稿內容、影片佔位與「我知道了」；按下主要操作或關閉教學後直接進入首頁，不再讀寫 onboarding 標記，也不建立續接點。

最少變更：

- [x] 實作共用 `tutorial-content`。
- [x] 首次教學以全螢幕 onboarding screen 呈現；不使用 modal 或遮罩點擊關閉。
- [x] 加入固定比例影片佔位與以下原文註解：

```ts
// TODO(video-license): 取得並保存指定影片的嵌入同意與來源紀錄後，才可啟用正式播放器。
```

- [x] 「我知道了」、關閉按鈕及 Android 返回操作都只將記憶體中的當次流程切換為結束並顯示首頁。

驗收：

- [x] 教學在小螢幕與大字級下可捲到底。
- [x] 不建立播放器、不發出網路請求、不顯示失效控制項。
- [x] 沒有影片仍可完成。
- [x] App 宗旨、動作宣導與安全提醒使用 `PRODUCT_SPEC.md` 7.5 原文。
- [x] 常見錯誤、呼吸與落地提示使用 `PRODUCT_SPEC.md` 7.5 的查核後文案，不在實作時改寫健康或動作指導。
- [x] `user_profile.nickname` 可為 null，`onboarding_state.onboarding_presented` 仍維持 true。
- [x] 呈現標記已成功後，App 在暱稱或教學步驟被強制終止時，下次直接進入首頁；若 effect 尚未成功則接受再顯示一次。

### [x] Slice 3：回訪首頁與問候

行為：已呈現首次引導的使用者重新開啟 App 時直接看見首頁，不再自動顯示教學；只有暱稱存在時才顯示「Hi，{暱稱}」。

最少變更：

- [x] 在既有首頁資訊層級中加入問候，不移動日曆主要操作。
- [x] 問候以 `headline` 層級獨立放在月份導覽上方並靠左對齊，不放入月份導航列或 icon 操作列。
- [x] 保持目前月份、完成狀態及音訊偏好查詢行為。

驗收：

- [x] 不重播 onboarding。
- [x] 暱稱為 null 時完全不渲染歡迎詞；不顯示空白占位、`Hi`、`null` 或替代名稱。
- [x] 原月曆、日期詳情、設定及訓練入口測試維持通過。
- [x] 問候不遮擋月份導航或主要操作，最多 20 字元的暱稱在放大字級時可自然換行且不截斷；不存在時不保留高度；在小螢幕裝置（如 4.7 吋）下維持 42 格日曆不溢出、不被遮蔽。
- [x] 螢幕閱讀順序為問候（若有）、月份導覽、今天／教學／設定、月曆。

### [x] Slice 4：首頁重新開啟教學

行為：點擊無障礙名稱為「動作教學」的首頁 icon 後，直接開啟可捲動的完整教學；關閉後回到原首頁狀態。

最少變更：

- [x] 使用現有 `IconButton` 與已安裝的 Lucide icon。
- [x] 教學入口固定使用 `BookOpen`（24 px、2 px stroke），放在「今天」與「設定」之間；三個 icon button 的觸控區都至少 44 × 44。
- [x] 重用 Slice 2 的教學內容。
- [x] 支援右上角關閉鍵、底部「關閉」、遮罩及 Android `onRequestClose`；不顯示「我知道了」。

驗收：

- [x] 觸控區至少 44 × 44。
- [x] 視覺與螢幕閱讀順序皆為「今天 → 動作教學 → 設定」；教學入口的無障礙名稱為「動作教學」，不顯示常駐文字或 tooltip。
- [x] 重開教學不顯示暱稱頁、不改寫 nickname 或 onboarding 標記。
- [x] 共用 `TutorialContent` 不包含操作按鈕；首次引導與重開 modal 各自提供「我知道了」與「關閉」。
- [x] 關閉後檢視月份、今日完成狀態及音訊設定保持不變。
- [x] Modal 開啟時螢幕閱讀器焦點不落到後方首頁控制項。

### [x] Slice 5：一般設定與暱稱維護

行為：首頁既有設定入口開啟標題為「設定」的 modal；使用者可在「個人資料」維護暱稱，並在「音訊」沿用既有即時保存開關。

最少變更：

- [x] 將既有音訊 modal (`src/features/calendar/components/audio-settings-modal.tsx`) 擴充重構為一般 settings modal (`src/features/settings/components/settings-modal.tsx`)，遷移音訊相關測試至 `settings-modal.test.tsx` 後清理移除舊檔；不增加另一個首頁入口或全域 store。
- [x] 開啟時重新讀取個人資料；讀取期間以半透明覆蓋層與 spinner 鎖住可見內容，但保留所有關閉方式。
- [x] 實作最後已知值、讀取失敗提示、明確修改後才可提交，以及關閉後忽略晚到結果。
- [x] 使用原生 `KeyboardAvoidingView`、`ScrollView` 與 Safe Area；保留音訊開關既有寫入契約。

驗收：

- [x] Modal 標題為「設定」，區域依序為「個人資料」、「音訊」，所有欄位在 loading 與讀取失敗時都維持可見。
- [x] Loading 覆蓋期間內容不可互動且不進入螢幕閱讀器導覽；spinner 以「正在讀取個人資料」宣告但不顯示可見文字。右上角關閉、遮罩與 Android 返回鍵仍可離開；關閉後的晚到結果不更新畫面。
- [x] 讀取失敗後以不阻擋操作、約 4 秒自動消失且 polite 宣告的 modal 內 toast/banner 顯示「個人資料讀取失敗」；不顯示重試按鈕，欄位恢復可操作，關閉再開時重新讀取。
- [x] 有最後已知暱稱時保留該值，從未成功讀取時顯示空白；未知持久值且空白未修改時「更新暱稱」停用，主動輸入後可提交。
- [x] 清空已知暱稱並提交會保存 null；寫入失敗保留草稿與既有首頁問候，成功則保持 modal 開啟並顯示「暱稱已更新」。
- [x] 未提交草稿在任何關閉方式下捨棄；已即時保存的音訊切換不回滾。
- [x] 軟鍵盤、小尺寸裝置及放大字級下，暱稱欄位、更新按鈕與音訊開關都可操作。

### [x] Slice 6：雙平台裝置驗收

- [x] iOS 與 Android：全新安裝完成一次首次引導。
- [x] 在教學頁按關閉後重新開啟 App，不再主動顯示引導。
- [x] 呈現標記成功後，在暱稱或教學步驟直接終止 App，重新開啟後直接進入首頁，不再顯示引導。
- [x] 模擬呈現標記未成功時，下次可再次顯示引導；若已有暱稱則預填，未修改不重寫，清空則移除。
- [x] 軟鍵盤開啟時暱稱欄位與「繼續」仍可見。
- [x] 小尺寸裝置、最大常用系統字級及螢幕閱讀器可完成流程。
- [x] Android 系統返回鍵在暱稱與教學兩步都等同右上角關閉，直接進入首頁且不顯示確認。
- [x] 首次引導呈現後重啟 App，直接顯示可操作日曆；只有已保存暱稱時顯示問候。

## 6. 自動驗證

專案配置為 Bun 管理腳本搭配 Jest（`jest-expo`）執行測試，以確保 React Native Flow 語法轉譯與 In-memory SQLite 正常執行。

每個 slice 的最小檢查：

```sh
bun run test -- <相關測試檔>
```

每個完整 slice 及 Phase 1 完成時：

```sh
bun run typecheck
bun run lint
bun run test -- --runInBand
```

測試只觀察 exported repository 結果、可見文字、role、無障礙名稱、使用者操作與首頁結果；不斷言 component private state、SQL 呼叫次數或 React component tree 形狀。

## 7. 已確認的實作規則

- 暱稱為選填；空值或只有空白時不保存但可繼續。有值時移除前後空白，不限制語言或字元集；首次引導與設定都使用原生 `maxLength={20}` 並顯示「最多 20 個字元」，不另做 Unicode grapheme 計數。
- 名稱中間的空白保留，保存與首頁問候使用同一個 trim 後值。
- 既有 modal 標題由「音訊設定」改為「設定」，其中「個人資料」為常駐區域；Phase 1 只實作暱稱新增與修改，不預建未來欄位或通用 profile schema，也不新增個人資料首頁 icon。
- 設定 modal 使用原生鍵盤避讓與可捲內容；標題和關閉鍵固定，內容受 Safe Area 限制且支援大字級增高，不新增 bottom-sheet 或鍵盤套件。
- 暱稱只由其區域內的次要按鈕「更新暱稱」提交；清空既有值時保存 null 並移除首頁歡迎詞，不另設刪除按鈕或確認。Modal 不設共同保存按鈕，音訊開關維持切換即保存，畫面不額外顯示保存時機說明。
- 暱稱寫入失敗時保留輸入並顯示「暱稱未能儲存，請再試一次」；不推進首次引導、不更新首頁問候、不自動重試或加入 fallback。
- 從設定更新暱稱成功後保持 modal 開啟，顯示可由螢幕閱讀器宣告的「暱稱已更新」；再次編輯時清除訊息，關閉後首頁使用新暱稱。
- 設定中未按「更新暱稱」的草稿在任何關閉方式下直接捨棄，不確認或自動保存；重新開啟時使用持久值，已即時保存的音訊變更不回滾。
- 設定讀取進行中保留完整 modal 版面，以半透明覆蓋層和置中 spinner 鎖住內容；欄位可見但不可互動且不進入螢幕閱讀器導覽，spinner 以「正在讀取個人資料」宣告但不顯示可見文字。標題與所有關閉方式仍可用，關閉後忽略晚到結果。失敗後移除覆蓋層，所有欄位恢復操作，並以約 4 秒自動消失、polite 宣告的 modal 內 toast/banner 顯示「個人資料讀取失敗」；不提供重新讀取按鈕，關閉再開時自然重試，也不新增套件。暱稱使用最後已知值，從未成功讀取時為空白。欄位仍可編輯，但只有實際修改後才能提交；未知持久值時不將未修改的空白視為刪除。
- App 尚未發布，schema version 2 視為發布前基線；不把 version 1 開發資料的 migration 相容性列為產品契約。
- 暱稱由 `user_profile`／`profile.ts` 擁有，引導呈現標記由 `onboarding_state`／`onboarding.ts` 擁有；兩者不共用資料表或 repository。
- 暱稱以「暱稱（選填）」呈現，「繼續」永遠可按且不另設「略過」；空值不寫入，有值但寫入失敗時不進入教學。
- 首次引導直接渲染全螢幕 screen；只有首頁重開教學使用 modal，兩者只共用 `TutorialContent`。
- Android 系統返回鍵在首次引導兩步都等同明確關閉，直接進首頁，不顯示確認對話框。
- 首次引導暱稱步驟實際掛載後，由一次性 effect 觸發非阻擋呈現標記寫入；不得在畫面切換前預先寫入。「我知道了」或關閉只結束當次記憶體流程，不再寫入標記。
- 引導呈現標記採非阻擋 best-effort；寫入失敗不顯示錯誤或重試，當次流程不受影響，下次可能再顯示一次。
- 不保存目前引導步驟；呈現標記已成功時，引導途中強制終止 App 後下次直接進入首頁。若 effect 或寫入尚未成功，接受下次再顯示一次。
- 首頁只在暱稱存在時顯示問候；暱稱為 null 時完全不渲染歡迎詞。
- 問候以 `headline` 獨立放在月份導覽上方並靠左對齊，可換行、不截斷；不存在時不保留空間。
- 常見錯誤、呼吸與落地提示使用 `PRODUCT_SPEC.md` 7.5 已查核文案。

## 8. 影片發布 gate

開發版以佔位完成，不阻擋 Slice 0–6。正式發布前仍須依 D-010 完成：

- [ ] 指定允許嵌入的 YouTube 影片。
- [ ] 保存 URL、頻道／創作者、詢問日期、書面回覆與確認日期。
- [ ] 由產品負責人決定未取得書面同意時是否可僅依允許嵌入狀態發布。
- [ ] 只有 gate 通過後才另行規劃官方播放器整合；不得把 Phase 7 的教學清單或能力分級帶入本階段。

## 9. Phase 1 Done 定義

- [x] Slice 0–6 全部通過。
- [x] TypeScript、lint、完整 Jest 測試皆通過。
- [x] iOS／Android 首次與回訪流程通過裝置驗收。
- [x] 既有日曆 → 訓練 → 保存 → 日曆閉環無回歸。
- [x] 範圍外防禦檢查：通過。
- [x] 未核准的新增行為：無。
- [ ] 開發交付可保留影片佔位；正式商店發布另須通過第 8 節 gate。
