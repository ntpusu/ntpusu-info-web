// 全站共用設定。頁面清單同時供導覽列、網站導覽頁、首頁、sitemap 使用，
// 避免各處各寫一份而日久漂移。

export const SITE = {
  /** 網站名稱（頁首、<title>、結構化資料共用） */
  name: "北大學生會公開資訊",
  /** 組織正式名稱（Organization 結構化資料、頁尾使用） */
  orgName: "國立臺北大學學生自治會",
  origin: "https://ntpusu.github.io",
  base: "/ntpusu-info-web",
  orgUrl: "https://ntpusu.ntpu.edu.tw/?Lang=zh-tw",
  repoUrl: "https://github.com/ntpusu/ntpusu-info-web",
  icon: "https://ntpusu.ntpu.edu.tw/var/file/15/1015/msys_1015_7477194_57479.ico",
} as const;

export interface PageInfo {
  /** 以 / 開頭、以 / 結尾的站內路徑（不含 base） */
  path: string;
  title: string;
  description: string;
  /** false 表示不給搜尋引擎索引，也不進 sitemap.xml */
  indexable: boolean;
  /** schema.org 的頁面型別 */
  schemaType: "WebPage" | "CollectionPage" | "AboutPage";
}

export const PAGES: readonly PageInfo[] = [
  {
    path: "/",
    title: "首頁",
    description:
      "北大學生會公開資訊，公開學生代表名冊與各單位正式文件。",
    indexable: true,
    schemaType: "WebPage",
  },
  {
    path: "/stureps/",
    title: "學生代表名冊",
    description: "臺北大學學生會推派至國立臺北大學各項會議的學生代表名冊。",
    indexable: false,
    schemaType: "CollectionPage",
  },
  {
    path: "/bulletin-board/",
    title: "學生自治布告欄",
    description:
      "臺北大學學生會各單位的正式文件，包含總會、三峽校區學生會與學生議會。",
    indexable: true,
    schemaType: "CollectionPage",
  },
  {
    path: "/sitemap/",
    title: "網站導覽",
    description: "本站所有頁面、區塊代號與快速鍵說明。",
    indexable: true,
    schemaType: "WebPage",
  },
];

export function getPage(path: string): PageInfo {
  const page = PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`未在 PAGES 登記的頁面：${path}`);
  return page;
}

/** 站內路徑 → 含 base 的相對網址（供 href 使用） */
export function href(path: string): string {
  return SITE.base + path;
}

/** 站內路徑 → 絕對網址（供 canonical、JSON-LD 使用） */
export function absoluteUrl(path: string): string {
  return SITE.origin + SITE.base + path;
}

/** 供 sitemap 的 filter 使用：傳入的是絕對網址 */
export function isIndexableUrl(url: string): boolean {
  const prefix = SITE.origin + SITE.base;
  const path = url.startsWith(prefix) ? url.slice(prefix.length) : url;
  const page = PAGES.find((p) => p.path === (path || "/"));
  return page ? page.indexable : true;
}
