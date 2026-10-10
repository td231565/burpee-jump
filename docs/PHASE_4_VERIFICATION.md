# Phase 4 實作與靜態驗證

日期：2026-10-10。主 agent 採 agent-orchestration-protocol Strict 流程；依使用者要求由 subagent 實作、主 agent 最終靜態驗證。

## 任務契約與所有權

範圍依據：PHASE_4_IMPLEMENTATION_PLAN.md 第 3 節已定案契約。交付自訂運動／休息秒數與組數、開始時保存設定、動態訓練排程、共用開始／休息語音及相應文件與測試。保留既有未提交音訊生命週期修正。不得 commit、push、建立 PR、改變背景安全暫停、擴充完成紀錄或加入契約外防禦。

| 切片 | 唯一 owner | 檔案與驗收 |
| --- | --- | --- |
| 計時核心 | timer_core | tabata.ts、use-tabata-timer.ts 與兩個同名測試；動態階段、snapshot、事件、暫停與完成，預設 110/113 秒 |
| 音訊來源查核 | audio_source（唯讀） | 查核素材來源、授權、格式與時長；不修改共享檔案 |
| 參數儲存與畫面 | preferences_ui，計時契約完成後串行 | database、workout-preferences、workout/index/timer-display 與受影響測試；保存／讀取、界限步進、三種入口 |
| 音訊接入 | audio_integration，畫面串接完成後串行 | audio-service、離線素材及音訊測試；共用事件、保留生命周期 |
| 文件同步 | docs_sync，實作完成後串行 | SPEC、DESIGN、CONTEXT、DISCUSSIONS、PLAN；不得聲稱實機通過 |
| 整合與最終靜態驗證 | 主 agent | diff、caller、型別、lint、範圍與 criteria → evidence 核對 |

共享契約：WorkoutParameters = {workSeconds, restSeconds, rounds}；預設 20/10/4；start(parameters) 固定當次 plan。所有依賴此契約的實作串行，避免同時修改共享檔案。設定編輯僅在 ready 畫面可達。

## 驗收界線

自動測試由實作 subagent 執行，主 agent 最終驗證為靜態核對。iOS／Android 實機、小螢幕／大字級／螢幕閱讀器與實際聽感不由 mock 或型別檢查推定通過。未取得證據的 Done 條件保持未勾選。

## 最終結果

計時核心靜態核對已完成：

- `createTabataPlan` 僅在組與組間插入休息；正式時長由同一階段陣列推導，準備固定加 3 秒。
- hook reducer 保存開始時的 plan，tick、FINISH 與完成 snapshot 都使用該 plan；重試保存不重建 plan。
- snapshot.totalRounds 由當次參數取得，事件 key 已統一為 work_start／rest。
- 保留既有偏好載入、過期初始化 guard、release 與 KeepAwake 清理修改。
- 靜態核對找到開始時／第一個 tick 重複準備提示，交由 timer_core 在此次提示不得重複契約內修正；起始事件後的評估游標排除 t=0。
- subagent 測試證據：`bun run test -- --runInBand __tests__/tabata.test.ts __tests__/use-tabata-timer.test.ts`，2 suites / 24 tests 通過；預設、非預設 3 組、單組與 10 組涵蓋。

參數儲存與畫面靜態核對已完成：

- v4 僅新增 workout_preferences 單筆資料；以單次 UPDATE 保存三項值，未擴充完成紀錄。
- controls 載入成功或失敗完成前停用，避免晚到讀取覆寫使用者草稿；讀取失敗使用預設且不觸發 UPDATE。
- 開始時提交當次設定並立即啟動同一參數的計時；保存失敗靜默，不改變完成紀錄的保存與重試。
- 草稿僅存在 ready；一般與不記錄訓練共用相同設定，開始後沒有修改入口。
- 沿用 44×44 IconButton、淡色表面與按壓縮放；control row 可換行，中間 ScrollView 保持 footer 可操作。此為靜態結構核對，未證明實機大字級可用。
- subagent focused Jest 證據：7 suites / 54 tests 通過（workout-preferences、database-migration-v3、workout、timer-display、index、workout-character、workout-rest-override）。涵蓋 SQLite 關閉／重開與有效參數 UPDATE 的 abort trigger，未以不可達輸入替代保存失敗情境。

音訊靜態核對已完成：

- `audio-service.ts` 僅替換語音 mapping，保留全域操作序列、失效初始化、暫停／繼續與播放器 remove/release。
- 2026-10-10 第一組提示修訂後，5 個語音 key 為 prepare、work_first_start、work_start、rest、completed；第一組使用「開始」片段，第二組起使用共用「準備，開始」。3 個提示音 key 及背景音樂不變。片段已確認與共用開始音檔尾段 PCM 完全相同；相關排程、hook、音訊服務與生命週期測試 47 項通過，實機聽感待驗收。
- 7 個編號語音與無引用的 test-cue 已刪除；src 中無舊 key、舊素材 caller、固定四組分母或固定兩分鐘文案。
- 主 agent 以 Python wave/hashlib 靜態讀檔核對：開始草稿 44.1kHz/mono/16-bit、1.248254s、SHA-256 f34d9736ba793be8d9d5a6a527aab2c9d536999e71571ddfea45438473da965a；休息草稿同格式、0.658050s、SHA-256 c93ee6039a8f9b1650e1422f16fdab15802fadded9fedb85b0f305d6a680ac5c。符合 ASSETS_LICENSES.md。
- 最短運動階段第一個最後五秒提示在開始後 5 秒，最短休息階段在開始後 1 秒；草稿時長分別短於此間距。未播放音訊，不能據此確認實際文案或聽感。
- 音訊 subagent 的新 key 測試 red→green：舊 mapping 0 次 seek/play、新 mapping 2 次；focused 3 suites / 24 tests 通過。

## 驗收條件 → 證據

對應計畫第 7 節順序。主 agent 核對下表，不以 subagent 的 DONE 代替整個 Phase 4 的最終驗收。

| # | 條件 | 證據與結果 |
| --- | --- | --- |
| 1 | 契約定案 | 計畫第 3 節、D-055–D-079；本次依定案範圍實作，通過 |
| 2 | 預設／非預設時長與階段 | tabata 純函式與測試；預設 7 stages/110s+3s、12/8/3、10/6/1、10/6/10，通過 |
| 3 | 範圍／步進／單組與最後不休息 | workout 公開加減互動走完上下限；tabata 僅在 round < rounds 插入休息，通過 |
| 4 | 摘要、倒數、組數與同次參數 | ready 草稿 → start(parameters) → reducer.plan；timer-display.totalRounds；hook 暫停／繼續測試，通過 |
| 5 | 保存／讀取失敗與重新讀回 | workout 公開互動、SQLite abort trigger 保留原值與其他 rows、關閉／重開檔案資料庫；自動驗證通過，App 實機重啟待驗收 |
| 6 | 第一組「開始」、後續「準備，開始」、無舊組次語音 | schedule/caller/asset mapping 與新 key 播放測試通過；草稿實際文案與來源授權待確認 |
| 7 | 提示關閉／音樂／重入／離開 | audio-service、workout-audio-lifecycle mock 五次重入、播放偏好、資源 remove 與暫停／繼續通過；原生實際出聲待驗收 |
| 8 | 最後五秒／休息／準備完成／不重複 | plan schedule、hook 起始游標與邊界測試通過；草稿素材與原生聽感待驗收 |
| 9 | 自訂完成記錄、取消、不記錄、重試與回饋 | 單組短訓練 INSERT、unrecorded 無 completion INSERT、日期鎖定／save retry／rest override／character 回歸通過 |
| 10 | 背景安全暫停與手動續跑 | hook AppState + lifecycle 回歸、static caller 核對無 background service 或程序恢復，通過；原生鎖屏待驗收 |
| 11 | 小螢幕／大字級／螢幕閱讀器／44×44 | shared IconButton、disabled state、標籤、row wrap/ScrollView/footer 靜態核對通過；各實機情境未驗收 |
| 12 | typecheck/lint/full tests | 見下方命令證據，通過；既存 act warnings 保留記錄 |
| 13 | iOS／Android 實機非預設流程與聲音 | 未執行；待使用者／裝置驗收 |
| 14 | 規格同步與範圍控管 | docs_sync 六份文件已由主 agent 核對；原 14 條驗收條件保留，僅勾選 1/2/3/4/9/12/14；未新增依賴、歷史或背景計時，範圍外防禦檢查通過；素材權利未完成 |

## 最終命令證據

- subagent：`bun run test -- --runInBand`，exit 0，31 suites / 206 tests 通過。全套完成後，僅修正完成畫面殘留 Tabata 字樣與匹配 assertion；`bun run test -- --runInBand --runTestsByPath __tests__/workout-character.test.tsx` 再驗證 1 suite / 12 tests 通過。未因純文字修正重跑其他未受影響 suites。
- 主 agent：`bun run typecheck`、`bun run lint`，皆 exit 0；`git diff --check` 通過。
- 主 agent：`rg` 核對 src 舊 key／舊素材／固定分母／固定開始文案無殘留；Python wave/hashlib 核對音訊格式／時長／hash。
- Jest 輸出仍有 React act(...) 警告，沒有測試斷言失敗。未把警告當作實機證據，未擴大範圍去改寫不相關測試。
- `ccc index` 通過：1175 files listed、3 added、19 reprocessed、error 0；文件同步後的最後靜態核對與 diffcheck 通過。

## 變更檔案

- 計時與音訊：`src/features/workout/tabata.ts`、`use-tabata-timer.ts`、`audio-service.ts`、`components/timer-display.tsx`。
- 參數與畫面：`src/data/database.ts`、新增 `src/data/workout-preferences.ts`；`src/app/workout.tsx`、`index.tsx`、`audio-test.tsx`。
- 素材：新增 `assets/audio/voice_work_start.wav`、`voice_rest.wav`；移除 4 個 voice_work_N、3 個 voice_rest_N 及無引用的 `assets/test-audio/test-cue.wav`。
- 測試：`__tests__/tabata.test.ts`、`use-tabata-timer.test.ts`、`timer-display.test.tsx`、`workout.test.tsx`、`index.test.tsx`、`database-migration-v3.test.ts`、`workout-character.test.tsx`、`audio-service.test.ts`、`audio-test.test.tsx`；新增 `workout-preferences.test.ts`，保留並適配既有未提交 `workout-audio-lifecycle.test.tsx`。`workout-rest-override.test.ts` 等未變更回歸測試仍通過。
- 文件：`PRODUCT_SPEC.md`、`PRODUCT_DISCUSSIONS.md`、`DESIGN.md`、`CONTEXT.md`、`PRODUCT.md`、`ASSETS_LICENSES.md`、`PHASE_4_IMPLEMENTATION_PLAN.md` 與本驗證報告。

## 狀態與限制

**BLOCKED（整個 Phase 4 完整驗收）**：程式實作及自動／靜態驗證已完成；素材來源、授權、實際文案／拼接聽感與 iOS／Android 實機驗收缺少證據，計畫的完整 Done 未成立。此狀態不表示自動測試失敗。

下一步：補齊語音素材來源與散布授權（或更換已授權錄音），驗聽共用開始／休息提示，於 iOS／Android 驗收非預設完整流程、設定重啟讀回、手動／安全暫停、再次進入與小螢幕／大字級／螢幕閱讀器。

範圍外防禦檢查：通過。未核准的新增行為：無。沒有 commit、push、PR、安裝／建置 App 或對外寫入。既有未提交音訊生命週期與首頁 profile-load 修正已保留。
