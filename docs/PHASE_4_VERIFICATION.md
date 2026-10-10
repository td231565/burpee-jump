# Phase 4 實作與靜態驗證

日期：2026-10-10。主 agent 採 agent-orchestration-protocol Strict 流程；依使用者要求由 subagent 實作、主 agent 最終靜態驗證。

## 任務契約與所有權

範圍依據：PHASE_4_IMPLEMENTATION_PLAN.md 第 3 節已定案契約。交付自訂運動／休息秒數與組數、開始時保存設定、動態訓練排程、共用開始／休息語音及相應文件與測試。保留既有未提交音訊生命週期修正。不得 commit、push、建立 PR、改變背景安全暫停、擴充完成紀錄或加入契約外防禦。

| 切片 | 唯一 owner | 檔案與驗收 |
| --- | --- | --- |
| 計時核心 | timer_core | tabata.ts、use-tabata-timer.ts 與兩個同名測試；動態階段、snapshot、事件、暫停與完成，預設 110/113 秒 |
| 音訊來源查核 | audio_source（唯讀） | 查核素材來源、授權、格式與時長；不修改共享檔案 |
| 參數儲存與畫面 | 待派送，計時契約完成後串行 | database、workout-preferences、workout/index/timer-display 與受影響測試；保存／讀取、界限步進、三種入口 |
| 音訊接入 | 待派送，計時契約完成後串行 | audio-service、離線素材及音訊測試；共用事件、保留生命周期 |
| 文件同步 | 待派送，實作完成後串行 | SPEC、DESIGN、CONTEXT、DISCUSSIONS、PLAN；不得聲稱實機通過 |
| 整合與最終靜態驗證 | 主 agent | diff、caller、型別、lint、範圍與 criteria → evidence 核對 |

共享契約：WorkoutParameters = {workSeconds, restSeconds, rounds}；預設 20/10/4；start(parameters) 固定當次 plan。所有依賴此契約的實作串行，避免同時修改共享檔案。設定編輯僅在 ready 畫面可達。

## 驗收界線

自動測試由實作 subagent 執行，主 agent 最終驗證為靜態核對。iOS／Android 實機、小螢幕／大字級／螢幕閱讀器與實際聽感不由 mock 或型別檢查推定通過。未取得證據的 Done 條件保持未勾選。

## 最終結果

待各切片完成後填入 criteria → evidence、命令結果與限制。
