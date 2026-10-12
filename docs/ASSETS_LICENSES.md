# 專案第三方資產授權清單（Assets Licenses）

本文件依據 `PRODUCT_SPEC.md` 第 3.7 節（原第 5.10 節）「訓練音訊與背景音樂規範」與 D-039/D-040 決議，記錄專案內嵌之第三方音訊與多媒體資產的合法來源、授權條款快照與署名要求。

---

## 1. 內建背景音樂（MVP Background Music）

### 基本資料
* **作品名稱**：Nature Loop (收錄於 *LOOP BOX #1: Beats for RPG, Platformers, Visual Novels, Adventure, Puzzle Games, Simulators, Menu Screens and Cutscenes*)
* **創作者 / 權利人**：Of Far Different Nature (OGA 帳號: `of-far-different-nature`)
* **作者官方頁面**：<https://fardifferent.carrd.co/>
* **原始來源 URL**：<https://opengameart.org/content/loop-box-1-beats-for-rpg-platformers-visual-novels-adventure-puzzle-games-simulators-menu>
* **取得 / 下載日期**：2026-09-12

### 授權條款與權利鏈
* **授權名稱與版本**：Creative Commons Attribution 4.0 International (CC BY 4.0)
* **授權條款全文 URL**：<https://creativecommons.org/licenses/by/4.0/legalcode>
* **授權許可摘要**：
  * 商業使用：允許（非商業與商業重製、散布均被許可）。
  * 離線隨安裝包封裝：允許（未限制載體或媒介，允許二進位安裝包離線分發）。
  * 改作與衍生作品：允許（允許進行格式轉換、剪輯或音量正規化）。
* **作者權利聲明快照**：
  > "Big loop pack with 15 tracks of diverse character. Enjoy!... I share CC0 and CC-BY 4.0 music here, because I want to contribute back to the community. Several of my past projects have only been possivle because of other people's amazing CC content. Good luck with your project!"

### App 內公開署名要求（依 D-040 實作於「音樂授權資訊」Modal）
作者指定之標準署名文字與連結：
```text
Music by Of Far Different Nature (https://fardifferent.carrd.co/)
Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
```

### 發布稽核檢核點
* [x] 零授權費（$0）確認
* [x] 非生成式 AI 原創宣告確認
* [x] 完整商業與離線散布權限確認
* [x] 原生無縫循環（Seamless loop）支援確認
* [ ] 實機音量 Ducking 驗收（待打包驗證）
* [ ] 最終音檔格式、大小及安裝包增加量記錄（待打包驗證）

---

## 2. Phase 4 導引語音（功能驗收通過；來源與授權資料待補）

以下音檔由既有素材衍生，已隨 Phase 4 由使用者於 2026-10-10 確認實際驗收通過。既有輸入音檔可追溯至 repository commit `a1a108c`；錄音者、取得來源與授權條款資料仍待補齊。本次功能驗收不提供新的權利證據，不據此宣稱新錄音、TTS 原創或授權已清除；發布前仍須補齊來源／授權資訊。

### `voice_work_first_start.wav`

* **用途**：第一組運動開始提示，預期文案為「開始」，避免重複前面的「準備」；已隨 Phase 4 由使用者確認實際驗收通過。
* **製作方式**：逐位元複製 commit `a1a108c` 的既有 `voice_work_1.wav`，未生成新語音內容。
* **輸入與草稿 SHA-256**：`8dd3c846ddc2f73b591c0856498ee50303b473e508f6efa4a6be278a397a2ac6`
* **格式與檢查值**：44.1 kHz、單聲道、16-bit PCM；0.572290 秒。

### `voice_work_start.wav`

* **用途**：Phase 4 第二組起共用運動開始提示的本機衍生草稿，預期文案為「準備，開始」；已隨 Phase 4 由使用者確認實際驗收通過。
* **製作方式**：依序串接既有 `voice_prepare.wav`、120 ms 數位靜音及既有 `voice_work_1.wav`；未生成新語音內容。
* **來源 SHA-256**：`voice_prepare.wav` `876e7f0cd0827974374396992e6e34ceb2ccb9a70c1d32ccb4983dc778bc09b7`；`voice_work_1.wav` `8dd3c846ddc2f73b591c0856498ee50303b473e508f6efa4a6be278a397a2ac6`
* **草稿 SHA-256**：`f34d9736ba793be8d9d5a6a527aab2c9d536999e71571ddfea45438473da965a`
* **格式與檢查值**：44.1 kHz、單聲道、16-bit PCM；1.248254 秒；絕對樣本峰值 25258 / 32768。

### `voice_rest.wav`

* **用途**：Phase 4 共用休息提示的本機衍生草稿，預期文案為「休息」；已隨 Phase 4 由使用者確認實際驗收通過。
* **製作方式**：逐位元複製既有 `voice_rest_1.wav`。既有 `voice_rest_1.wav`、`voice_rest_2.wav` 與 `voice_rest_3.wav` 的 SHA-256 相同。
* **輸入與草稿 SHA-256**：`c93ee6039a8f9b1650e1422f16fdab15802fadded9fedb85b0f305d6a680ac5c`
* **格式與檢查值**：44.1 kHz、單聲道、16-bit PCM；0.658050 秒；絕對樣本峰值 21757 / 32768。

三份音檔長度均符合對應最短階段的提示間距檢查。靜態時長與 PCM 證據保留；功能與聽感驗收依使用者 2026-10-10 確認，素材權利資料仍獨立待補。
