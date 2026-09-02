import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "@/lib/errors";

describe("apiErrorMessage", () => {
  it("returns the service's own message when there is one", () => {
    const err = { response: { data: { error: "college code already exists" } } };
    expect(apiErrorMessage(err, "fallback")).toBe("college code already exists");
  });

  it("falls back when the response carries no error field", () => {
    expect(apiErrorMessage({ response: { data: {} } }, "fallback")).toBe("fallback");
    expect(apiErrorMessage({ response: {} }, "fallback")).toBe("fallback");
  });

  it("falls back for network errors and non-objects", () => {
    expect(apiErrorMessage(new Error("Network Error"), "fallback")).toBe("fallback");
    expect(apiErrorMessage(null, "fallback")).toBe("fallback");
    expect(apiErrorMessage("boom", "fallback")).toBe("fallback");
  });
});
