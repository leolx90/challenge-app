import { describe, it, expect } from "vitest";
import {
  formatDateLocal,
  formatDateForDb,
  getCurrentPeriodBounds,
  countPeriods,
  isInPeriod,
  computeEndDate,
  CADENCE_DAYS,
  type Cadence,
} from "./cadence";

describe("cadence", () => {
  describe("formatDateLocal", () => {
    it("formats date as YYYY-MM-DD in local date parts", () => {
      const d = new Date(2025, 2, 3); // March 3, 2025 (month 0-indexed)
      expect(formatDateLocal(d)).toBe("2025-03-03");
    });
    it("pads month and day with zero", () => {
      expect(formatDateLocal(new Date(2025, 0, 5))).toBe("2025-01-05");
      expect(formatDateLocal(new Date(2025, 8, 9))).toBe("2025-09-09");
    });
  });

  describe("formatDateForDb", () => {
    it("returns YYYY-MM-DD from toISOString", () => {
      const d = new Date("2025-03-03T12:00:00Z");
      expect(formatDateForDb(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(formatDateForDb(d).length).toBe(10);
    });
  });

  describe("getCurrentPeriodBounds", () => {
    it("for day cadence, returns single calendar day as start and end", () => {
      const d = new Date(2025, 2, 3, 14, 30, 0);
      const { start, end } = getCurrentPeriodBounds(d, "day", "2025-01-01");
      expect(formatDateLocal(start)).toBe("2025-03-03");
      expect(formatDateLocal(end)).toBe("2025-03-03");
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });
    it("for week cadence, aligns periods to challenge start_date", () => {
      const startDate = "2025-03-01"; // Saturday
      const day0 = new Date(2025, 2, 1, 12, 0, 0);  // March 1
      const { start: s0, end: e0 } = getCurrentPeriodBounds(day0, "week", startDate);
      expect(formatDateLocal(s0)).toBe("2025-03-01");
      expect(formatDateLocal(e0)).toBe("2025-03-07");

      const day7 = new Date(2025, 2, 8, 12, 0, 0);  // March 8
      const { start: s1, end: e1 } = getCurrentPeriodBounds(day7, "week", startDate);
      expect(formatDateLocal(s1)).toBe("2025-03-08");
      expect(formatDateLocal(e1)).toBe("2025-03-14");
    });
    it("for two_weeks cadence, returns 14-day period", () => {
      const startDate = "2025-03-01";
      const d = new Date(2025, 2, 10, 12, 0, 0); // March 10 = day 9, still in period 0 (Mar 1–14)
      const { start, end } = getCurrentPeriodBounds(d, "two_weeks", startDate);
      expect(formatDateLocal(start)).toBe("2025-03-01");
      expect(formatDateLocal(end)).toBe("2025-03-14");
    });
    it("for month cadence, returns 30-day period from start", () => {
      const startDate = "2025-01-01";
      const d = new Date(2025, 0, 15, 12, 0, 0);
      const { start, end } = getCurrentPeriodBounds(d, "month", startDate);
      expect(formatDateLocal(start)).toBe("2025-01-01");
      expect(formatDateLocal(end)).toBe("2025-01-30");
    });
  });

  describe("countPeriods", () => {
    it("counts 1 for a single day with day cadence", () => {
      const start = new Date(2025, 2, 1);
      const end = new Date(2025, 2, 1);
      expect(countPeriods(start, end, "day")).toBe(1);
    });
    it("counts multiple days with day cadence", () => {
      const start = new Date(2025, 2, 1);
      const end = new Date(2025, 2, 5);
      expect(countPeriods(start, end, "day")).toBe(5);
    });
    it("counts weekly periods (ceil so partial period counts)", () => {
      const start = new Date(2025, 2, 1);  // March 1
      const end = new Date(2025, 2, 7);    // March 7
      expect(countPeriods(start, end, "week")).toBe(1);
      const end2 = new Date(2025, 2, 8);
      expect(countPeriods(start, end2, "week")).toBe(2);
    });
    it("returns 0 for end before start", () => {
      const start = new Date(2025, 2, 5);
      const end = new Date(2025, 2, 1);
      expect(countPeriods(start, end, "day")).toBe(0);
    });
  });

  describe("isInPeriod", () => {
    it("returns true when timestamp is within period inclusive", () => {
      const start = new Date(2025, 2, 1, 0, 0, 0);
      const end = new Date(2025, 2, 7, 23, 59, 59);
      expect(isInPeriod(new Date(2025, 2, 3, 12, 0, 0), start, end)).toBe(true);
      expect(isInPeriod(new Date(2025, 2, 1, 0, 0, 0), start, end)).toBe(true);
      expect(isInPeriod(new Date(2025, 2, 7, 23, 59, 59), start, end)).toBe(true);
    });
    it("returns false when timestamp is outside period", () => {
      const start = new Date(2025, 2, 1, 0, 0, 0);
      const end = new Date(2025, 2, 7, 23, 59, 59);
      expect(isInPeriod(new Date(2025, 1, 28, 12, 0, 0), start, end)).toBe(false);
      expect(isInPeriod(new Date(2025, 2, 8, 0, 0, 0), start, end)).toBe(false);
    });
  });

  describe("computeEndDate", () => {
    it("computes last day of last period for daily cadence", () => {
      const start = new Date(2025, 2, 1);
      const end = computeEndDate(start, 3, "day");
      expect(formatDateLocal(end)).toBe("2025-03-03");
    });
    it("computes last day for weekly cadence", () => {
      const start = new Date(2025, 2, 1);
      const end = computeEndDate(start, 2, "week");
      expect(formatDateLocal(end)).toBe("2025-03-14");
    });
  });

  describe("CADENCE_DAYS", () => {
    it("has expected values", () => {
      expect(CADENCE_DAYS.day).toBe(1);
      expect(CADENCE_DAYS.week).toBe(7);
      expect(CADENCE_DAYS.two_weeks).toBe(14);
      expect(CADENCE_DAYS.month).toBe(30);
    });
  });
});
