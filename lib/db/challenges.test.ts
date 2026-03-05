import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkIn, ensureChallengeStatus } from "./challenges";

const mockUser = { id: "user-1", email: "u@example.com" };

function createChallengesMock(
  challenge: { cadence: string; status: string; start_date: string; end_date: string } | null
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: challenge, error: null }),
  };
  return chain;
}

function createCheckInsMock(existing: { checked_in_at: string; period_start: string | null }[] = []) {
  const promise = Promise.resolve({ data: existing });
  const chain: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn> } = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(promise);
  return chain;
}

function createSupabaseMock(options: {
  challenge: { cadence: string; status: string; start_date: string; end_date: string } | null;
  existingCheckIns?: { checked_in_at: string; period_start: string | null }[];
}) {
  const challengesChain = createChallengesMock(options.challenge);
  const checkInsChain = createCheckInsMock(options.existingCheckIns ?? []);
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "challenges") return challengesChain;
    if (table === "check_ins") return checkInsChain;
    return {};
  });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from,
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("checkIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows check-in when date and period are within challenge range", async () => {
    const supabase = createSupabaseMock({
      challenge: {
        cadence: "day",
        status: "open",
        start_date: "2025-03-01",
        end_date: "2025-03-03",
      },
      existingCheckIns: [],
    });
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await checkIn("challenge-1", "2025-03-03", "2025-03-03");
    expect(result.error?.message).not.toBe("Challenge has not started yet");
  });

  it("allows check-in and returns no error when not already checked in", async () => {
    const supabase = createSupabaseMock({
      challenge: {
        cadence: "day",
        status: "open",
        start_date: "2025-03-01",
        end_date: "2025-03-05",
      },
      existingCheckIns: [],
    });
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await checkIn("challenge-1", "2025-03-05", "2025-03-05");
    expect(result.error).toBeUndefined();
  });

  it("rejects with 'Challenge has not started yet' when client date is before start_date", async () => {
    const supabase = createSupabaseMock({
      challenge: {
        cadence: "day",
        status: "open",
        start_date: "2025-03-01",
        end_date: "2025-03-03",
      },
    });
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await checkIn("challenge-1", "2025-02-28");
    expect(result.error?.message).toBe("Challenge has not started yet");
  });

});

describe("ensureChallengeStatus (completion cutoff)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not update when todayUtc is before cutoff (end_date + 2)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-04T12:00:00Z"));
    const eqSpy = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "challenges") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { end_date: "2025-03-03" },
              error: null,
            }),
            update: updateSpy,
          };
        }
        return {};
      }),
    };
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await ensureChallengeStatus("challenge-1");
    expect(updateSpy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("updates to completed when todayUtc >= end_date + 2", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-05T12:00:00Z"));
    const secondEqSpy = vi.fn().mockResolvedValue({ error: null });
    const firstEqSpy = vi.fn().mockReturnValue({ eq: secondEqSpy });
    const updateSpy = vi.fn().mockReturnValue({ eq: firstEqSpy });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "challenges") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { end_date: "2025-03-03" },
              error: null,
            }),
            update: updateSpy,
          };
        }
        return {};
      }),
    };
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await ensureChallengeStatus("challenge-1");
    expect(updateSpy).toHaveBeenCalledWith({ status: "completed" });
    expect(firstEqSpy).toHaveBeenCalledWith("id", "challenge-1");
    expect(secondEqSpy).toHaveBeenCalledWith("status", "open");
    vi.useRealTimers();
  });
});
