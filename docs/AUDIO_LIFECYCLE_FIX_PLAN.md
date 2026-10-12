# 背景音樂返回首頁後無聲：診斷與修正計劃

日期：2026-10-08。狀態：已完成程式修正與自動驗證；相關音訊流程隨 Phase 4 由使用者於 2026-10-10 確認實際驗收通過。

## 實作結果

- 訓練畫面等待 SQLite 偏好讀取完成才建立音訊服務，避免以全開預設播放再重建。
- Expo 全域音訊操作依呼叫順序執行：舊服務停用完成後，新服務才能設定、啟用與播放。
- 保留 pause／release 的全域停用以交還焦點；背景音樂開啟時，initialize／resume 對稱啟用。背景音樂關閉時，提示實際播放才啟用，避免在準備頁或繼續後等待提示期間提前 Ducking。全關閉時不取得焦點。
- 離開同步標記服務失效，初始化或 seek 尚未完成也不得補播；使用 `AudioPlayer.remove()` 釋放原生資源，重複 release 不再停用全域音訊。
- 保持計時、保存與音訊讀取失敗後的靜音流程；KeepAwake 的卸載清理不依賴偏好是否已讀取。

正式回歸測試：`__tests__/audio-service.test.ts`、新增的 `__tests__/workout-audio-lifecycle.test.tsx`。新增畫面整合測試使用真實 hook／audio service，只 mock Expo、SQLite 與路由邊界；涵蓋連續進出五次、完成後重新進入、初始化途中取消、偏好关闭／讀取失敗，以及 music 開／關的安全暫停與繼續後提示播放。

驗證結果：全部 30 個測試套件、189 個測試通過；`tsc --noEmit`、`expo lint`、`git diff --check` 通過。既有部分畫面測試仍輸出非 act 包覆更新的警告；新增整合測試使用 act／waitFor。無暫時 debug instrumentation。

範圍外防禦檢查：通過。未核准的新增行為：無。

限制：自動測試可驗證播放、啟用、清理順序，無法證明裝置實際出聲或第三方音樂的響度恢復。2026-10-10 使用者已確認 Phase 4 實作完畢且已實際驗收，包含相關音訊流程的整體驗收狀態見 `PHASE_4_VERIFICATION.md`；未另提供下方各原生情境的逐項執行明細。

## 判斷與證據

使用者情境：背景音樂偏好開啟，返回首頁再進入訓練卻無聲；設定中關閉再開啟後恢復。

首頁沒有把已保存的 `music_enabled` 改成 false 的路徑。設定開關透過 `src/app/index.tsx` 的 `handleUpdatePreferences` 寫入 SQLite；訓練離開只清理音訊，未更新偏好。因此目前最符合程式證據的是音訊生命週期問題，並非首頁重設偏好。

已確認的缺口：

1. `src/features/workout/audio-service.ts`：`pause()` 呼叫全域 `setIsAudioActiveAsync(false)`；`release()` 也透過 `pause()` 關閉全域音訊。`initialize()` 與 `resume()` 沒有對稱的顯式啟用。
2. `src/app/workout.tsx`：初始偏好為全開，立即交给 `useTabataTimer`；資料庫讀取後再用新物件更新偏好，即使值相同也觸發 effect 重跑。
3. `src/features/workout/use-tabata-timer.ts`：偏好變更時不等待舊 `release()` 完成就初始化新服務；初始化完成回呼也沒有失效檢查。舊清理可能全域暫停新播放器，舊初始化也可能在離開後播放。
4. `release()` 只清空播放器參照，未呼叫 Expo `AudioPlayer.remove()`，無法確實釋放原生播放器。

本地安裝版本為 expo-audio 57.0.5。iOS 原生 `play()` 本身會啟用 AVAudioSession，而 `setIsAudioActiveAsync(false)` 會暫停所有播放器；`setAudioModeAsync()` 只設定 category。因此「缺少 true」本身不足以證明 iOS 此次無聲，清理與啟動的先後順序是主要調查方向。

## 診斷驗證

診斷檔案位於 `/tmp/burpeejump-audio-diagnosis/`，使用真實 `TabataAudioService` 與可控制的 Expo 邊界 mock，未修改既有測試。

執行命令（專案根目錄）：

```sh
./node_modules/.bin/jest --config /tmp/burpeejump-audio-diagnosis/jest.config.json --runInBand
```

結果：既有 5 個測試通過；新增 3 個診斷測試失敗。

- 兩個依 Expo 公開全域啟用契約建模的測試：release → 新服務 initialize/play，以及 pause → resume，均沒有顯式恢復 active。這是契約缺口，不代表 iOS 一定無法透過 play 自行啟用。
- 一個符合 iOS 全域暫停行為的順序測試：舊服務 release 尚未完成 → 新服務 initialize/play → 舊全域停用完成，結果新播放被停止。此測試證明程式無法抵抗該順序，尚未證明使用者裝置每次都採用此順序。

Computer Use 回傳指定 App 無效，未取得實機音訊或原生呼叫 trace。設定關閉再開啟為何恢復，尚需原生環境核對；此操作目前只改寫 SQLite，沒有直接啟用音訊的程式碼。

## 修正順序

### 1. 先建立正式回歸測試

- 在 `__tests__/audio-service.test.ts` 加入跨服務清理與播放、暫停／繼續的行為測試；用可控制 promise 驗證延遲停用，不只計算函式呼叫次數。
- 在訓練畫面／音訊整合 seam 使用真實音訊服務，mock Expo 與 SQLite，測試讀取偏好後只初始化一次，以及取消後立即重新進入。現有 `workout.test.tsx` 將整個音訊服務 mock 掉，無法捕捉此缺陷。
- 加入偏好關閉的情境，確認不會因讀取前的全開預設而短暫播放。

### 2. 消除讀取前的重複初始化

檔案：`src/app/workout.tsx`、`src/features/workout/use-tabata-timer.ts`。

- 偏好尚未讀取完成時不初始化音訊；讀取完成後以保存值初始化一次。
- 讀取失敗沿用靜音降級，計時與保存照常。
- effect 清理使已過期的初始化回呼失效，離開畫面後不得啟動音樂或更新畫面。
- 清理正在初始化的服務也必須涵蓋晚建立的播放器；只有 callback guard 不足以釋放資源。

### 3. 修正服務清理與啟用責任

檔案：`src/features/workout/audio-service.ts`、必要的 hook 協調。

- `release()` 確實停止並 `remove()` 自己擁有的播放器，做到重複清理安全。
- 優先避免局部服務卸載直接停用全域音訊，讓舊服務無法停止新服務。核對 Expo 原生自動解除音訊焦點行為；若為符合安全暫停契約仍需全域停用，則清理／啟用必須排序，完成舊停用後才允许新播放。
- 保留安全暫停解除 Ducking 與不暫停第三方音樂的契約。
- 需要全域停用的暫停路徑，在 initialize／resume 對稱啟用，順序為停用完成後再啟用、播放。
- resume 的啟用不能依賴背景音樂開關；只有提示語音開啟也必須正常恢復。

不改資料庫 schema，不重設使用者偏好，不新增套件或設定選項。避免只補一行 `true` 而留下舊清理晚到的問題。

### 4. 驗收

- 自動測試：新增回歸情境、既有 audio-service／use-tabata-timer／workout／settings-modal 測試；執行 typecheck 與 lint。
- 原生驗收：保持背景音樂開啟，進入訓練 → 取消返回首頁 → 再進入，連續 5 次均可聽到音樂，不需切换設定。
- 完整完成返回首頁後，再做一次仍有音樂。
- 手動暫停／繼續與退背景／回前景／手動繼續正常；回前景不能自動開始計時或播放。
- 關閉背景音樂、保持提示語音開啟，暫停／繼續後提示正常；第三方音樂不被暫停，短提示後解除 Ducking。
- 開關偏好在返回首頁與重啟後一致；離開訓練後無殘留音訊。

若原生情境仍有無聲，加入限時、具標籤的 initialize／release／active／play 順序 trace，核對實際順序後再修正；驗收後移除 instrumentation。
