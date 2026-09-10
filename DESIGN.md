---
name: BurpeeJump
description: 以柔和晨光與自然小徑，陪伴初學者完成每天兩分鐘的波比跳小冒險。
colors:
  warm-canvas: "#FAF9F6"
  solid-surface: "#FFFFFF"
  subtle-surface: "#F1F5F9"
  deep-slate-ink: "#1E293B"
  muted-slate: "#64748B"
  sky-primary: "#0284C7"
  sky-soft: "#E0F2FE"
  sky-border: "#BAE6FD"
  exercise-rose: "#E11D48"
  exercise-rose-soft: "#FFE4E6"
  morning-amber: "#D97706"
  morning-yellow-soft: "#FEF9C3"
  morning-yellow-border: "#FDE047"
  completion-green: "#16A34A"
  completion-green-soft: "#DCFCE7"
  error-red: "#DC2626"
  error-red-soft: "#FEE2E2"
  quiet-border: "#E2E8F0"
typography:
  display:
    fontFamily: "system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 800
    lineHeight: "96px"
  hero:
    fontFamily: "system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
  headline:
    fontFamily: "system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  sm: "12px"
  md: "18px"
  lg: "24px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.sky-primary}"
    textColor: "{colors.solid-surface}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.solid-surface}"
    textColor: "{colors.deep-slate-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "52px"
  button-disabled:
    backgroundColor: "{colors.subtle-surface}"
    textColor: "{colors.muted-slate}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "52px"
  icon-button:
    backgroundColor: "{colors.subtle-surface}"
    textColor: "{colors.deep-slate-ink}"
    rounded: "{rounded.full}"
    size: "44px"
  calendar-surface:
    backgroundColor: "{colors.solid-surface}"
    textColor: "{colors.deep-slate-ink}"
    rounded: "{rounded.lg}"
    padding: "8px"
  timer-work:
    backgroundColor: "{colors.exercise-rose-soft}"
    textColor: "{colors.exercise-rose}"
    rounded: "{rounded.lg}"
    padding: "24px"
  timer-rest:
    backgroundColor: "{colors.sky-soft}"
    textColor: "{colors.sky-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: BurpeeJump

## Overview

**Creative North Star: "晨光自然小徑"**

使用者可能在早晨、午休或下班後的居家空間打開手機，準備完成一段短而有強度的運動。介面把每天兩分鐘想像成走過一小段晨光自然小徑，以明亮暖白為環境光，搭配天空、草地邊緣、葉片、石頭與小花等低對比線索；果凍感保留在圓角表面與按壓觸感，不再是整個世界觀。

視覺設計服務於每日兩分鐘的可靠流程。日曆可以像每日抵達的小徑入口，完成時可以出現發芽、開花或日出等回饋，倒數仍必須果斷；裝飾只出現在不影響資訊辨識的留白區，運動階段則由大字、語意色與聲音共同表達。角色不是產品成立的前提，人形角色可以作為偶發陪伴，但製作成本過高時必須完整省略。核心畫面永遠保持單一主要行動，不用角色、插畫、卡片或設定選項堆疊出虛假的豐富感。

**Key Characteristics:**

- 溫暖明亮的淺色介面，不使用純黑背景或高飽和霓虹。
- 天空、草地、小徑、葉片與晨光形成戶外小冒險感，不導入地圖或收集玩法。
- 連續大圓角、淡色實心表面、細邊框與極輕陰影形成果凍感。
- 淺藍、粉紅、淡黃與淺綠各自承擔明確的流程語意。
- 核心倒數優先於所有裝飾，距離手機一段距離仍需清楚可讀。
- 動效只回應操作或狀態變化，時長以 150 至 250ms 為界，不使用彈跳或裝飾性進場。

**The Quiet Artwork Rule.** 背景、插畫、角色與 icon 都是流程的配角。移除任何裝飾或角色後，資訊層級與操作意義不得改變。

## Colors

色彩採「柔和全角色」策略：多個 pastel 表面提供情緒，但飽和色只用於文字、邊框、主要操作及狀態確認。

### Primary

- **晴空行動藍**：主要按鈕、休息階段與目前可執行的主要操作。不可拿來填滿不具互動意義的大面積背景。
- **晴空柔藍與薄霧藍邊**：休息計時表面、輕提示與藍色元件的邊界。

### Secondary

- **運動莓果紅**：只表示運動階段與需要立即辨識的運動提示。
- **運動莓果柔粉**：運動計時表面，必須搭配文字或階段名稱，不得只靠粉紅傳達狀態。

### Tertiary

- **晨光琥珀與柔黃**：今天、準備倒數與少量陽光裝飾。
- **完成嫩綠**：已完成與儲存成功。沒有完成紀錄時不得使用此色暗示成功。
- **錯誤紅與柔紅**：音訊降級、儲存失敗及需處理的錯誤，不作一般裝飾。

### Neutral

- **暖紙畫布**：所有主要頁面的背景，降低純白刺眼感。
- **實心白表面**：現有卡片及 modal 表面；新增大面積表面應先評估是否可改用暖紙畫布或微妙淺灰。
- **深板岩墨色**：主要文字與暫停徽章，確保 pastel 表面上的對比。
- **霧板岩與安靜邊線**：次要文字、停用狀態、分隔線及非本月日期。

**The Semantic Color Rule.** 相同狀態永遠使用相同色彩角色。不得因為畫面單調而交換運動紅、休息藍、今日黃或完成綠。

**The Pastel Contrast Rule.** 淡色只能當表面，重要文字必須使用對應的深色語意色或深板岩墨色；狀態不得只依賴顏色。

## Typography

**Display Font:** 系統無襯線字體

**Body Font:** 系統無襯線字體

**Character:** 使用手機原生系統字體維持熟悉、快速與高可讀性。個性來自色彩、圓角與插畫，不用展示字體犧牲運動中的辨識速度。

### Hierarchy

- **Display**：只用於正式倒數數字，採極粗字重與固定行高。
- **Hero**：階段名稱與最高層級標題，不得用於一般按鈕或標籤。
- **Title**：頁面及 modal 的主要標題。
- **Headline**：主要按鈕、組數資訊及重要操作標籤。
- **Body**：說明、規則與一般內容；長文每行維持約 65 至 75 個半形字元以內。
- **Label**：日期、星期與輔助標籤，不能承載核心操作說明。

**The Distance Test.** 正式計時畫面需在手機離使用者約一個手臂距離時，仍能分辨階段名稱、剩餘秒數與暫停狀態。

**The One Family Rule.** 產品 UI 只使用系統無襯線字體。不得為了日系感在按鈕、日期或倒數加入手寫字、明體或裝飾字。

## Elevation

採平面為主、柔和抬升為輔。深度主要由實心色塊、細邊框與不同表面色建立；陰影只標示主要行動或把日曆等大型互動區從畫布中輕微抬起，不製造漂浮卡片牆。

### Shadow Vocabulary

- **主要行動抬升**：藍色陰影向下偏移 4px、透明度 0.18、模糊半徑 8px，Android elevation 3；只用於主要按鈕。
- **日曆環境陰影**：墨色陰影向下偏移 2px、透明度 0.04、模糊半徑 6px，Android elevation 1；只用於月曆容器。
- **內容表面陰影**：墨色陰影向下偏移 4px、透明度 0.06、模糊半徑 10px，Android elevation 2；用於日期詳情等單一重點表面。

**The Flat-by-Default Rule.** 表面靜止時預設平坦。若同一畫面出現三個以上有陰影的容器，表示層級已經過度設計。

## Components

### Buttons

- **Shape:** 連續柔和圓角，最小高度 52px，水平內距 24px、垂直內距 12px。
- **Primary:** 晴空行動藍搭配實心白文字，一個畫面原則上只有一個主要按鈕。
- **Secondary:** 實心表面、安靜邊線與深板岩文字，不加陰影。
- **Pressed:** 透明度降為 0.85 並縮放至 0.98；disabled 移除陰影並使用微妙表面與霧板岩文字。
- **Focus:** 必須保留平台原生無障礙焦點表現，不以顏色作為唯一焦點線索。

### Icon Buttons

- **Style:** 使用單一線性 icon 系統，建議 Lucide React Native；基準圖示尺寸 24px、線寬 2、視覺顏色為深板岩墨色。
- **Target:** 圖示可視尺寸不等於點擊範圍，所有 icon button 固定至少 44 × 44px。
- **State:** pressed 縮放至 0.94 並降低透明度；disabled 透明度為 0.4。
- **Consistency:** 同一功能在所有畫面使用同一 glyph。禁止混合 emoji、文字符號、填色圖示與不同線寬的圖示包。

### Cards / Containers

- **Corner Style:** 一般內容使用 18px 或 24px 連續圓角；日期指示器使用 12px。
- **Background:** 以實心表面或語意 pastel 表面為主，不使用透明玻璃與背景模糊。
- **Border:** 使用 1px 安靜邊線；正式計時卡使用 2px 對應階段色邊線。
- **Internal Padding:** 從既有 4、8、12、16、24、32px 間距尺度選擇，不新增相近但不一致的數值。

### Calendar

- 六週、42 格高度固定。今天使用晨光黃，完成使用嫩綠與勾號；完成狀態優先於今天狀態。
- 日期至少 44 × 44px 可點擊；非本月日期降低透明度，未來日期不可互動。
- 月曆保持熟悉的 Calendar 介面，不以插畫、貼紙或特殊形狀取代日期網格。

### Timer

- 準備、運動、休息分別使用晨光黃、莓果粉、晴空藍表面，且必須同時顯示文字階段名稱。
- 倒數是畫面中最大的元素。背景圖、插畫與裝飾不得進入倒數卡內，也不得降低數字對比。
- 暫停以深板岩實心膠囊和「已暫停」文字表示，不只改變色彩。

### Backgrounds and Illustrations

- **Background:** 核心畫面使用暖紙畫布，以淡天空、草地邊緣、小徑、葉片、石頭、小花與晨光建立戶外感。裝飾限於 2 至 3 個低對比景物群，透明度約 0.08 至 0.16，只能放在安全區與內容留白，不得鋪在文字、日期或控制項後方。
- **Photography:** 日曆、準備與正式計時畫面禁止滿版照片。照片只可評估用於商店宣傳圖，不屬於核心產品 UI。
- **Illustration:** 一個畫面最多一張，只用於首次引導、空狀態或完成時刻。完成畫面可用發芽、開花、小徑前進或日出表達「今天走了一小步」，但不得取代明確的完成文字與返回操作。
- **Nature colors:** 自然裝飾不得借用完成綠或其他語意色。正式實作戶外背景前，必須另建低彩度的 foliage、soil 與 sky-decoration token，避免裝飾被誤認為狀態。
- **App icon:** 必須是自有組合標誌，建議以「晨光圓盤＋自然小徑＋跳躍人形」或簡化的「B＋葉片」發展。不得直接把素材庫 glyph 或第三方插畫當作品牌標誌。

### Optional Human Character

- **Optionality:** 角色完全可選。沒有角色時，天空、草地、小徑、植物與完成回饋必須仍能獨立建立世界觀。
- **Form:** 可以使用原創人形角色；採簡化 2D 輪廓、清楚動作與 3 至 5 個主要顏色，不要求寫實比例、細緻五官、複雜服裝、材質或逐格動畫。
- **Role:** 只作為首次引導、完成時刻或商店宣傳圖中的陪伴與動作提示。月曆操作、狀態判斷與正式倒數不得依賴角色。
- **Placement:** 正式計時畫面預設不顯示角色；若日後驗證確有幫助，只能出現在倒數卡外且不得與數字爭奪注意力。
- **Originality:** 皮克敏與寶可夢只作為「戶外探索、自然親近、輕冒險」的氣氛參考，不得借用可辨識的角色輪廓、頭頂莖葉生物、紅白球、捕捉語彙、屬性徽章、戰鬥介面、招牌字體或配色組合。

**The Optional Character Rule.** 角色必須能零成本移除。若角色需要新增資料狀態、玩法、複雜動畫或延後發佈，立即省略角色。

### Asset Sources and Licensing

- **Lucide:** UI icon 首選，ISC License。React Native 應使用套件元件並只匯入實際需要的 icon。
- **Tabler Icons:** Lucide 缺少合適 glyph 時的備選，MIT License；必須保留授權與版權聲明。
- **unDraw:** 支援性插畫來源，可免費商用且不要求署名；不得重新包裝或散布素材集合。
- **Kenney:** CC0 的 UI、圖案與遊戲素材，可作為背景 pattern 或簡單裝飾來源。
- **Pexels:** 僅用於商店宣傳圖候選，免費商用且不強制署名；仍需檢查肖像、商標與背書風險。
- **Storyset:** 只有能在 App 內提供清楚署名時才可使用免費素材。
- 每次引入第三方素材，都必須在 `assets/THIRD_PARTY_ASSETS.md` 記錄檔名、來源網址、作者、授權名稱、下載日期、是否修改與署名文字。尚未實際引入素材時不建立空白紀錄。

## Do's and Don'ts

### Do:

- **Do** 讓今天的主要行動始終只有一個，低頻設定退居次要入口。
- **Do** 讓裝飾停留在留白區，並在 200% 系統字級、窄螢幕與戶外較亮環境重新檢查遮擋及對比。
- **Do** 使用 Lucide 或另一套單一線性 icon 系統，統一 24px 基準尺寸與 2px 線寬。
- **Do** 以文字、圖示與色彩共同表達今天、完成、運動、休息、暫停、錯誤等狀態。
- **Do** 優先使用 SVG 或套件 icon；點陣背景需提供足夠解析度並壓縮，避免增加啟動時間。
- **Do** 先完成不含角色的自然場景，再把原創人形角色視為可選的最後一層美術增量。
- **Do** 保留每項第三方素材的授權證據，正式發佈前逐項複核。

### Don't:

- **Don't** 採競技健身、軍事訓練或高壓減重語氣。
- **Don't** 以羞辱、焦慮或斷掉紀錄的罪惡感迫使使用者運動。
- **Don't** 使用高飽和霓虹、玻璃擬態、漸層文字或過度裝飾的健身儀表板。
- **Don't** 把設定、統計或未來功能堆進每日主要流程。
- **Don't** 在正式倒數、日期數字或主要操作後方放置照片、紋理或高對比圖形。
- **Don't** 使用 emoji 或文字符號充當正式 UI icon。
- **Don't** 混合多套 icon 視覺語言，或在不同畫面用不同圖示表示同一功能。
- **Don't** 從沒有明確逐項授權的聚合站直接下載素材，也不要使用標示為「free for personal use」的素材。
- **Don't** 把免費素材庫中的現成圖示或插畫直接當作 BurpeeJump 商標或 App icon。
- **Don't** 模仿皮克敏或寶可夢的可辨識角色、道具、字體、配色、捕捉或戰鬥介面；只能借鑑高層次的戶外探索氣氛。
- **Don't** 為了角色加入收集、地圖、養成或其他目前需求沒有的玩法，也不要讓角色製作延後 MVP 發佈。
- **Don't** 使用超過 1px 的單側彩色邊線作為卡片裝飾，不使用巢狀卡片或裝飾性 modal。
