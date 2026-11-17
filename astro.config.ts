import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE, isIndexableUrl } from "./src/lib/site";

// GitHub Pages 專案網站：網址為 https://ntpusu.github.io/ntpusu-info-web/
export default defineConfig({
  site: SITE.origin,
  base: SITE.base,
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    // 不應被索引的頁面（如學生代表名冊）不放進 sitemap.xml
    sitemap({ filter: (page) => isIndexableUrl(page) }),
  ],
});
