# 臺北大學學生會 資訊公開專區

[本會網站](https://ntpusu.ntpu.edu.tw)已遷至 RPage，若干資料受限於該平台的彈性，無法以簡便的方式維護，因此另建資訊公開專區網站，網址為 https://ntpusu.github.io/ntpusu-info-web/ ，呈現該等資料。

## 提供資料

- [學生代表名冊](https://ntpusu.github.io/ntpusu-info-web/stureps/)（不開放搜尋引擎索引）。
- [學生自治布告欄](https://ntpusu.github.io/ntpusu-info-web/bulletin-board/)。
- [網站導覽](https://ntpusu.github.io/ntpusu-info-web/sitemap/)。

## Tech Stack

- [Astro](https://astro.build)（靜態輸出）＋ TypeScript，套件管理使用 pnpm。
- 樣式：[Blades](https://github.com/anyblades/blades)（Pico CSS 接班版），色彩集中於 `src/styles/theme.css`。
- 學生代表名冊於使用者端從 jsDelivr 載入資料，更新資料不需重新部署本站。

```powershell
pnpm install
pnpm dev              # 開發伺服器
pnpm build            # 輸出到 dist/
pnpm check            # Astro / TypeScript 型別檢查
pnpm check:contrast   # 驗證 theme.css 的 WCAG 對比
```

## 新增頁面

1. 在 `src/lib/site.ts` 的 `PAGES` 登記（標題、描述、是否可索引）。登記後導覽、網站導覽頁、sitemap 與 JSON-LD 會自動帶入。
2. 在 `src/pages/` 新增頁面，並使用 `<Layout path="…">`。

## 無障礙

以 WCAG 2.2 AAA 為目標，並提供臺灣規範的定位點（`:::`，快速鍵 U／C／B）與網站導覽頁。修改配色後請執行 `pnpm check:contrast`。

## 資料儲存

本專區的資料，為了與本會其它雲端服務共用，儲存在專屬的資料儲存庫 [ntpusu/legislative-data](https://github.com/ntpusu/legislative-data)。

布告欄嵌入的資料，則是各單位 Google Drive 資料夾。
