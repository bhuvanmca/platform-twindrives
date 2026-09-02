import { describe, expect, it } from "vitest";
import {
  clearSession,
  getRefreshToken,
  getToken,
  safeNext,
  setSession,
} from "@/lib/session";

describe("session", () => {
  it("round-trips a token pair", () => {
    setSession({ token: "access-1", refresh_token: "refresh-1" });
    expect(getToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
  });

  it("drops a stale refresh token when the new pair has none", () => {
    setSession({ token: "access-1", refresh_token: "refresh-1" });
    setSession({ token: "access-2" });
    expect(getToken()).toBe("access-2");
    // Replaying refresh-1 against a session it no longer belongs to is exactly
    // the bug this clears.
    expect(getRefreshToken()).toBeNull();
  });

  it("clears both keys on sign-out", () => {
    setSession({ token: "access-1", refresh_token: "refresh-1" });
    clearSession();
    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("reports no token before anyone signs in", () => {
    expect(getToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps an ordinary in-app path", () => {
    expect(safeNext("/colleges/3")).toBe("/colleges/3");
    expect(safeNext("/storage?tab=logs")).toBe("/storage?tab=logs");
  });

  it("falls back when there is nothing to return to", () => {
    expect(safeNext(null)).toBe("/colleges");
    expect(safeNext(undefined)).toBe("/colleges");
    expect(safeNext("")).toBe("/colleges");
  });

  it("refuses to redirect off-site", () => {
    expect(safeNext("https://evil.example")).toBe("/colleges");
    expect(safeNext("//evil.example")).toBe("/colleges");
    // A backslash after the slash: some browsers normalise "/\\host" to a
    // protocol-relative URL, so it is rejected alongside "//host".
    expect(safeNext("/\\evil.example")).toBe("/colleges");
    expect(safeNext("javascript:alert(1)")).toBe("/colleges");
  });

  it("does not bounce back to the login page", () => {
    expect(safeNext("/login")).toBe("/colleges");
    expect(safeNext("/login?expired=1")).toBe("/colleges");
  });
});
