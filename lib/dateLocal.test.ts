import { describe, expect, it } from "vitest";
import { paraDataLocal, paraMesLocal } from "./dateLocal";

describe("paraDataLocal", () => {
  it("formats using local date components, zero-padded", () => {
    expect(paraDataLocal(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(paraDataLocal(new Date(2026, 7, 31))).toBe("2026-08-31");
  });

  it("does not shift across a UTC day boundary — the bug this replaces", () => {
    // 31/07/2026 23:30 in a UTC-3 timezone would be 01/08 02:30 UTC.
    // toISOString().slice(0,10) on that instant would wrongly say
    // "2026-08-01" — paraDataLocal must stay on the local calendar day.
    const tardeDaNoite = new Date(2026, 6, 31, 23, 30);
    expect(paraDataLocal(tardeDaNoite)).toBe("2026-07-31");
  });
});

describe("paraMesLocal", () => {
  it("returns YYYY-MM from local date components", () => {
    expect(paraMesLocal(new Date(2026, 7, 15))).toBe("2026-08");
  });

  it("keeps a late-local-night, month-end transaction in the correct month", () => {
    const tardeDaNoite = new Date(2026, 6, 31, 23, 30);
    expect(paraMesLocal(tardeDaNoite)).toBe("2026-07");
  });
});
