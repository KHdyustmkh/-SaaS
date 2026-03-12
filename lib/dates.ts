export type LostItemStatus = "保管中" | "警察へ" | "返還" | "廃棄";

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export function getPoliceDeadline(foundAt: Date | string): Date {
  const d = typeof foundAt === "string" ? new Date(foundAt) : foundAt;
  return addDays(d, 7);
}

export function getOwnershipDate(foundAt: Date | string): Date {
  const d = typeof foundAt === "string" ? new Date(foundAt) : foundAt;
  return addDays(d, 90);
}

export function daysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isWarningForUnreported(
  status: LostItemStatus,
  foundAt: Date | string
): boolean {
  // 未提出かつ6日経過したアイテムに警告
  if (status !== "保管中") return false;
  const diff = daysSince(foundAt);
  return diff >= 6 && diff < 7;
}

