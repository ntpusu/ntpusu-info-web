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

export type SeatStatus =
  | { kind: "none-required" }
  | { kind: "complete"; count: number }
  | { kind: "partial"; count: number }
  | { kind: "empty" };

export function seatStatus(meeting: MeetingWithReps): SeatStatus {
  if (!meeting.totalSeats) return { kind: "none-required" };
  const total = Number(meeting.totalSeats);
  const count = meeting.assignedReps.length;
  if (count > 0 && count === total) return { kind: "complete", count };
  if (count > 0) return { kind: "partial", count };
  return { kind: "empty" };
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
