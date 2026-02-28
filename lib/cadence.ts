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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get the start and end of the current cadence period that contains `date`.
 * Periods are aligned to the challenge start date:
 * - day: single calendar day
 * - week: 7-day block from start_date (period 0 = days 0–6, period 1 = days 7–13, …)
 * - two_weeks: 14-day block from start_date
 * - month: 30-day block from start_date
 *
 * @param challengeStartDate - YYYY-MM-DD; required for week, two_weeks, month.
 */
export function getCurrentPeriodBounds(
  date: Date,
  cadence: Cadence,
  challengeStartDate: string
): { start: Date; end: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (cadence === "day") {
    return { start: new Date(d), end: new Date(d) };
  }

  const startDate = new Date(challengeStartDate + "T00:00:00");
  startDate.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor(
    (d.getTime() - startDate.getTime()) / DAY_MS
  );
  const periodDays =
    cadence === "week" ? 7 : cadence === "two_weeks" ? 14 : 30;
  const periodIndex = Math.max(0, Math.floor(daysSinceStart / periodDays));
  const start = new Date(startDate);
  start.setDate(start.getDate() + periodIndex * periodDays);
  const end = new Date(start);
  end.setDate(start.getDate() + periodDays - 1);
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
