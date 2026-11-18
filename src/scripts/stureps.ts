// 學生代表名冊：在使用者端從 jsDelivr 載入資料並渲染。
// 一律用 DOM API（textContent）組畫面，不拼接 HTML 字串，所以不需要手動跳脫。

import {
  DATA_URL,
  buildMeetingsWithReps,
  describeSeats,
  formatDate,
  matchesQuery,
  safeHttpUrl,
  seatStatus,
  type MeetingWithReps,
  type RepresentativesData,
} from "../lib/stureps";

const CACHE_KEY = "stureps-data-cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時，僅限本機瀏覽器
const FETCH_TIMEOUT_MS = 15_000;

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`找不到元素 #${id}`);
  return el as T;
};

const els = {
  loading: $("loading-state"),
  error: $("error-state"),
  retry: $<HTMLButtonElement>("retry-button"),
  empty: $("empty-state"),
  tools: $("tools"),
  query: $<HTMLInputElement>("query"),
  expandAll: $<HTMLButtonElement>("expand-all"),
  collapseAll: $<HTMLButtonElement>("collapse-all"),
  status: $("result-status"),
  updated: $("last-updated"),
  list: $("meetings-list"),
};

// ---------- 快取 ----------
function readCache(): RepresentativesData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fetchedAt: number; data: RepresentativesData };
    if (typeof parsed.fetchedAt !== "number" || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: RepresentativesData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch {
    // 儲存空間滿了或被封鎖時略過，不影響功能
  }
}

// ---------- 小型 DOM 工具 ----------
type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

/** 站外連結：同分頁開啟（3.2.5 不在使用者不知情下開新視窗） */
function link(url: string | undefined, text: string): Node {
  const safe = safeHttpUrl(url);
  return safe ? h("a", { href: safe }, text) : document.createTextNode(text);
}

/** 定義清單的一列；value 為空時不輸出 */
function row(label: string, value: Child): Node[] {
  if (!value) return [];
  return [h("dt", {}, label), h("dd", {}, value)];
}

function badge(meeting: MeetingWithReps): Node | null {
  const s = seatStatus(meeting);
  switch (s.kind) {
    case "none-required":
    case "unknown":
      return null;
    case "complete":
      return h("span", { class: "badge badge-ok" }, `已有 ${s.count} 席資料`);
    case "partial":
      return h("span", { class: "badge badge-warn" }, `僅有 ${s.count} 席資料`);
    case "over":
      return h("span", { class: "badge badge-warn" }, `資料有 ${s.count} 席，多於法定席次`);
    case "empty":
      return h("span", { class: "badge badge-warn" }, "無推派資料");
  }
}

// ---------- 渲染 ----------
function renderCampus(
  label: string,
  regulationLabel: string,
  regulation: string | undefined,
  method: string | undefined,
): Node[] {
  if (!regulation && !method) return [];
  const inner = h("dl", { class: "nested" });
  inner.append(
    ...row("依據", regulation && `${regulationLabel}${regulation}`),
    ...row("推派方式", method),
  );
  return [h("dt", {}, label), h("dd", {}, inner)];
}

function renderMeeting(meeting: MeetingWithReps): HTMLElement {
  const details = h("details", { class: "meeting" });

  const seatText = describeSeats(meeting.totalSeats);
  const summary = h("summary", {}, h("strong", {}, meeting.name));
  if (seatText) {
    summary.append(" ", h("span", { class: "muted" }, `（${seatText}）`));
    const b = badge(meeting);
    if (b) summary.append(" ", b);
  }
  details.append(summary);

  // 基本資訊
  const info = h("dl");
  info.append(
    ...row("承辦單位", meeting.department && link(meeting.departmentLink, meeting.department)),
    ...row("本會法定可推派席次", meeting.totalSeats ? String(meeting.totalSeats) : null),
    ...row(
      "會議資料",
      meeting.link &&
        (meeting.link === "non-public"
          ? h("span", { class: "muted" }, "非公開")
          : link(meeting.link, "查看會議資料")),
    ),
  );
  if (info.childElementCount) details.append(h("section", {}, h("h3", {}, "基本資訊"), info));

  // 推派方式
  const nomination = h("dl");
  nomination.append(
    ...row("依據", meeting.regulationArticle && `本會學代推派辦法${meeting.regulationArticle}`),
    ...row("席次分配", meeting.seatDistribution),
    ...renderCampus("三峽校區", "三峽學代推派條例", meeting.sanxiaRegulation, meeting.sanxiaMethod),
    ...renderCampus("臺北校區", "臺北學代推派條例", meeting.taipeiRegulation, meeting.taipeiMethod),
    ...row("其他推派方式", meeting.otherMethod),
  );
  if (nomination.childElementCount) {
    details.append(h("section", {}, h("h3", {}, "推派方式"), nomination));
  }

  // 學生代表
  const repsSection = h("section", {}, h("h3", {}, "學生代表"));
  if (meeting.assignedReps.length > 0) {
    const tbody = h("tbody");
    for (const rep of meeting.assignedReps) {
      tbody.append(
        h("tr", {}, h("td", {}, rep.name), h("td", {}, rep.title || "—"), h("td", {}, rep.department || "—")),
      );
    }
    const table = h(
      "table",
      {},
      h("caption", {}, `${meeting.name}學生代表，共 ${meeting.assignedReps.length} 人`),
      h(
        "thead",
        {},
        h("tr", {}, h("th", { scope: "col" }, "姓名"), h("th", { scope: "col" }, "職稱"), h("th", { scope: "col" }, "系級")),
      ),
      tbody,
    );
    // 可捲動區域必須能以鍵盤聚焦（axe: scrollable-region-focusable）
    repsSection.append(
      h("div", { class: "table-scroll", role: "region", "aria-label": `${meeting.name}學生代表表格`, tabindex: "0" }, table),
    );
  } else {
    repsSection.append(h("p", { class: "muted" }, "目前尚無學生代表資料"));
  }
  details.append(repsSection);

  // 備註
  if (meeting.note) {
    details.append(h("section", {}, h("h3", {}, "備註"), h("p", { class: "pre-wrap" }, meeting.note)));
  }
  return details;
}

let allMeetings: MeetingWithReps[] = [];
let statusTimer: number | undefined;

function applyFilter(announce: boolean): void {
  const query = els.query.value;
  let shown = 0;
  allMeetings.forEach((m, i) => {
    const node = els.list.children[i] as HTMLElement;
    const match = matchesQuery(m, query);
    node.hidden = !match;
    if (match) shown++;
  });
  const text = query.trim()
    ? shown
      ? `共 ${allMeetings.length} 場會議，符合條件 ${shown} 場。`
      : "沒有符合條件的會議。"
    : `共 ${allMeetings.length} 場會議。`;
  // 輸入時延後播報，避免每個按鍵都打斷螢幕報讀軟體
  window.clearTimeout(statusTimer);
  const write = () => (els.status.textContent = text);
  if (announce) statusTimer = window.setTimeout(write, 500);
  else write();
}

function render(data: RepresentativesData): void {
  els.loading.hidden = true;
  els.error.hidden = true;
  els.updated.textContent = `最近一次同步時間：${formatDate(data.lastUpdated)}`;

  allMeetings = buildMeetingsWithReps(data);
  if (allMeetings.length === 0) {
    els.empty.hidden = false;
    return;
  }
  els.tools.hidden = false;
  els.list.replaceChildren(...allMeetings.map(renderMeeting));
  applyFilter(false);
}

function showError(): void {
  els.loading.hidden = true;
  els.error.hidden = false;
  els.updated.textContent = "";
}

async function fetchData(): Promise<RepresentativesData> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(DATA_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as RepresentativesData;
  } finally {
    window.clearTimeout(timer);
  }
}

async function load(): Promise<void> {
  els.error.hidden = true;
  els.loading.hidden = false;
  const cached = readCache();
  if (cached) {
    render(cached);
    return;
  }
  try {
    const data = await fetchData();
    writeCache(data);
    render(data);
  } catch (err) {
    console.error("讀取學生代表資料失敗：", err);
    showError();
  }
}

els.query.addEventListener("input", () => applyFilter(true));
els.retry.addEventListener("click", () => void load());
const setAll = (open: boolean) => {
  els.list.querySelectorAll("details").forEach((d) => {
    if (!d.closest("[hidden]")) d.open = open;
  });
};
els.expandAll.addEventListener("click", () => setAll(true));
els.collapseAll.addEventListener("click", () => setAll(false));

void load();
