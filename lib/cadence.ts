export type Cadence = "day" | "week" | "two_weeks" | "month";

export const CADENCE_DAYS: Record<Cadence, number> = {
  day: 1,
  week: 7,
  two_weeks: 14,
  month: 30,
};

/**
 * Compute end_date from start_date, length, and cadence.
 * end_date is the last day of the last period (inclusive).
 */
export function computeEndDate(
  startDate: Date,
  length: number,
  cadence: Cadence
): Date {
  const days = CADENCE_DAYS[cadence] * length;
  const end = new Date(startDate);
  end.setDate(end.getDate() + days - 1);
  return end;
}

/**
 * Format end_date for DB (YYYY-MM-DD). Use at challenge creation.
 */
export function formatDateForDb(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Get the number of cadence periods between start and end (inclusive of both ends).
 * Used for "total check-ins needed so far" when end = min(today, end_date).
 * Uses ceil so that any started period counts (e.g. 10 days with weekly = 2 periods).
 */
export function countPeriods(
  startDate: Date,
  endDate: Date,
  cadence: Cadence
): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  const periodDays = CADENCE_DAYS[cadence];
  return Math.max(0, Math.ceil(diffDays / periodDays));
}

/**
 * Get the start and end of the current cadence period that contains `date`.
 * Used to check if user already checked in this period.
 * For "week" we use Sunday–Saturday; for "day" it's the single day; for "month" it's calendar month.
 */
export function getCurrentPeriodBounds(
  date: Date,
  cadence: Cadence
): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (cadence === "day") {
    return { start: new Date(d), end: new Date(d) };
  }

  if (cadence === "week") {
    const day = d.getDay(); // 0 = Sunday
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (cadence === "two_weeks") {
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor(
      (d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
    );
    const periodIndex = Math.floor(dayOfYear / 14);
    const start = new Date(startOfYear);
    start.setDate(1 + periodIndex * 14);
    const end = new Date(start);
    end.setDate(start.getDate() + 13);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // month
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Check if a timestamp falls within a period (inclusive).
 */
export function isInPeriod(
  checkedInAt: Date,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const t = checkedInAt.getTime();
  return t >= periodStart.getTime() && t <= periodEnd.getTime();
}
