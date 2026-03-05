import { describe, it, expect } from "vitest";
import {
  isChallengeNotStartedForUser,
  getCompletionCutoffUtc,
  isCompletionCutoffReached,
} from "./challengeDates";

describe("challengeDates", () => {
  describe("isChallengeNotStartedForUser", () => {
    it("returns false when client date equals start_date (first day - can check in)", () => {
      expect(isChallengeNotStartedForUser("2025-03-01", "2025-03-01")).toBe(false);
    });
    it("returns false when client date is after start_date", () => {
      expect(isChallengeNotStartedForUser("2025-03-02", "2025-03-01")).toBe(false);
    });
    it("returns true when client date is before start_date", () => {
      expect(isChallengeNotStartedForUser("2025-02-28", "2025-03-01")).toBe(true);
      expect(isChallengeNotStartedForUser("2024-12-31", "2025-01-01")).toBe(true);
    });
    it("trims and uses first 10 chars", () => {
      expect(isChallengeNotStartedForUser("  2025-02-28  ", "2025-03-01")).toBe(true);
    });
  });

  describe("getCompletionCutoffUtc", () => {
    it("returns end_date + 2 days in UTC", () => {
      expect(getCompletionCutoffUtc("2025-03-03")).toBe("2025-03-05");
      expect(getCompletionCutoffUtc("2025-01-01")).toBe("2025-01-03");
    });
    it("handles month boundary", () => {
      expect(getCompletionCutoffUtc("2025-01-31")).toBe("2025-02-02");
    });
    it("handles year boundary", () => {
      expect(getCompletionCutoffUtc("2024-12-31")).toBe("2025-01-02");
    });
    it("trims input", () => {
      expect(getCompletionCutoffUtc("  2025-03-03  ")).toBe("2025-03-05");
    });
  });

  describe("isCompletionCutoffReached", () => {
    it("returns false when todayUtc is before cutoff (end_date + 2)", () => {
      expect(isCompletionCutoffReached("2025-03-03", "2025-03-03")).toBe(false); // cutoff 2025-03-05
      expect(isCompletionCutoffReached("2025-03-04", "2025-03-03")).toBe(false);
    });
    it("returns true when todayUtc equals cutoff", () => {
      expect(isCompletionCutoffReached("2025-03-05", "2025-03-03")).toBe(true);
    });
    it("returns true when todayUtc is after cutoff", () => {
      expect(isCompletionCutoffReached("2025-03-06", "2025-03-03")).toBe(true);
      expect(isCompletionCutoffReached("2025-04-01", "2025-03-03")).toBe(true);
    });
    it("ensures challenge is only marked completed the day after end_date+1 in UTC (all timezones had their last day)", () => {
      // end_date = March 3 → cutoff = March 5 UTC
      // So we don't mark completed on March 3 or March 4 UTC; we mark on March 5+ UTC
      expect(isCompletionCutoffReached("2025-03-04", "2025-03-03")).toBe(false);
      expect(isCompletionCutoffReached("2025-03-05", "2025-03-03")).toBe(true);
    });
  });
});
