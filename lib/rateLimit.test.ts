import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks the call once the limit is reached", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks each key independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(keyA, 3, 60_000);
    expect(checkRateLimit(keyA, 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 3, 60_000).allowed).toBe(true);
  });

  it("allows calls again once the window has passed", () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    const start = Date.now();
    vi.setSystemTime(start);

    for (let i = 0; i < 2; i++) checkRateLimit(key, 2, 1000);
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(false);

    vi.setSystemTime(start + 1001);
    expect(checkRateLimit(key, 2, 1000).allowed).toBe(true);

    vi.useRealTimers();
  });
});
