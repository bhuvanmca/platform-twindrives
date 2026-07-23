// Pulls the human message the Go services put in `{ "error": "…" }` out of an
// axios error, falling back to a generic string.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const e = (err as { response?: { data?: { error?: string } } }).response
      ?.data?.error;
    if (e) return e;
  }
  return fallback;
}
