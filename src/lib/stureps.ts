// 學生代表名冊的資料型別與純函式（不碰 DOM，方便單獨檢查）。
// 資料由 ntpusu/legislative-data 產生，經 jsDelivr 提供。

export const DATA_URL =
  "https://cdn.jsdelivr.net/gh/ntpusu/legislative-data@main/data/representatives.json";

export interface Meeting {
  name: string;
  department?: string;
  departmentLink?: string;
  totalSeats?: number | string;
  /** 網址，或字串 "non-public" 表示不公開 */
  link?: string;
  regulationArticle?: string;
  seatDistribution?: string;
  sanxiaRegulation?: string;
  sanxiaMethod?: string;
  taipeiRegulation?: string;
  taipeiMethod?: string;
  otherMethod?: string;
  note?: string;
}

export interface Representative {
  name: string;
  title?: string;
  department?: string;
}

export interface Assignment {
  meetingName: string;
  representativeName: string;
}

export interface RepresentativesData {
  lastUpdated: string;
  meetings?: Meeting[];
  representatives?: Representative[];
  assignments?: Assignment[];
}

export interface MeetingWithReps extends Meeting {
  assignedReps: Representative[];
}

/**
 * 把 assignments 對應到 meetings / representatives。
 * 以 filter 而非 find 比對，學代同名時不會靜默漏掉資料。
 * （根本解法是資料端提供唯一 ID，前端只保證不漏顯示。）
 */
export function buildMeetingsWithReps(data: RepresentativesData): MeetingWithReps[] {
  const assignments = data.assignments ?? [];
  const representatives = data.representatives ?? [];
  return (data.meetings ?? []).map((meeting) => ({
    ...meeting,
    assignedReps: assignments
      .filter((a) => a.meetingName === meeting.name)
      .flatMap((a) => representatives.filter((r) => r.name === a.representativeName)),
  }));
}

/**
 * 法定席次。資料端的 totalSeats 是自由文字：多數為純數字（"2"），
 * 少數為「至少1」這類寫法，所以不能直接 Number()。
 */
export interface SeatQuota {
  /** exact：恰好 n 席；min：至少 n 席 */
  mode: "exact" | "min";
  n: number;
}

/** 解析不出來（例如「視需要」）時回傳 null，呼叫端不應據此發出警告 */
export function parseSeatQuota(value: number | string | undefined): SeatQuota | null {
  const m = /^(至少)?\s*(\d+)\s*[名席人]?$/.exec(String(value ?? "").trim());
  return m ? { mode: m[1] ? "min" : "exact", n: Number(m[2]) } : null;
}

/** 摘要用的法定席次文字；沒有席次資訊時回傳 null */
export function describeSeats(value: number | string | undefined): string | null {
  if (!value) return null;
  const quota = parseSeatQuota(value);
  if (!quota) return `法定 ${value}`;
  return quota.mode === "min" ? `法定至少 ${quota.n} 席` : `法定 ${quota.n} 席`;
}

export type SeatStatus =
  | { kind: "none-required" }
  /** 法定席次格式無法解析，只顯示原文，不比對 */
  | { kind: "unknown"; count: number }
  | { kind: "complete"; count: number }
  | { kind: "partial"; count: number }
  /** 資料筆數多於法定席次（僅 exact 會發生） */
  | { kind: "over"; count: number }
  | { kind: "empty" };

export function seatStatus(meeting: MeetingWithReps): SeatStatus {
  if (!meeting.totalSeats) return { kind: "none-required" };
  const count = meeting.assignedReps.length;
  const quota = parseSeatQuota(meeting.totalSeats);
  if (!quota) return { kind: "unknown", count };
  if (count === 0) return { kind: "empty" };
  if (count < quota.n) return { kind: "partial", count };
  if (quota.mode === "exact" && count > quota.n) return { kind: "over", count };
  return { kind: "complete", count };
}

/** 只接受 http(s) 網址，避免資料內出現 javascript: 等協定 */
export function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function matchesQuery(meeting: MeetingWithReps, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    meeting.name,
    meeting.department,
    ...meeting.assignedReps.flatMap((r) => [r.name, r.title, r.department]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return haystack.includes(q);
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Taipei",
  });
}
