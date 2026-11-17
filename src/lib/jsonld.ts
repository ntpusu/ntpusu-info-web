// 產生 schema.org JSON-LD。只描述公開、可被索引的頁面；
// 不可索引的頁面（如學生代表名冊）不輸出任何結構化資料。
import { PAGES, SITE, absoluteUrl, getPage } from "./site";

const ID = {
  website: `${absoluteUrl("/")}#website`,
  org: `${absoluteUrl("/")}#organization`,
};

export function buildJsonLd(path: string): Record<string, unknown> | null {
  const page = getPage(path);
  if (!page.indexable) return null;

  const url = absoluteUrl(page.path);
  const isHome = page.path === "/";
  const graph: Record<string, unknown>[] = [
    {
      "@type": page.schemaType,
      "@id": `${url}#webpage`,
      url,
      name: isHome ? `${SITE.orgName} ${SITE.name}` : page.title,
      description: page.description,
      inLanguage: "zh-Hant-TW",
      isPartOf: { "@id": ID.website },
      publisher: { "@id": ID.org },
      ...(isHome ? {} : { breadcrumb: { "@id": `${url}#breadcrumb` } }),
    },
  ];

  if (isHome) {
    graph.push(
      {
        "@type": "WebSite",
        "@id": ID.website,
        url: absoluteUrl("/"),
        name: `${SITE.orgName} ${SITE.name}`,
        inLanguage: "zh-Hant-TW",
        publisher: { "@id": ID.org },
      },
      {
        "@type": "Organization",
        "@id": ID.org,
        name: SITE.orgName,
        url: SITE.orgUrl,
        sameAs: [SITE.repoUrl],
      },
    );
  } else {
    const home = PAGES[0]!;
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: home.title, item: absoluteUrl(home.path) },
        { "@type": "ListItem", position: 2, name: page.title, item: url },
      ],
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** 放進 <script type="application/ld+json"> 前跳脫 <，避免提前結束標籤 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
