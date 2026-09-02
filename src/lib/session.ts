// Single owner of the platform-console session in localStorage. Every other
// module goes through these helpers so the two keys never drift apart — before
// this existed, login wrote only the access token and logout cleared only that
// key, which is why an expired token had no way back other than /login.

const TOKEN_KEY = "platform_token";
const REFRESH_KEY = "platform_refresh_token";

export interface SessionTokens {
  token: string;
  refresh_token?: string | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Stores a freshly issued pair. A missing refresh token clears the old one
 *  rather than leaving a stale value that would be replayed on the next 401. */
export function setSession({ token, refresh_token }: SessionTokens) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Private mode / storage disabled — the session just won't survive a reload.
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // nothing to clear
  }
}

/**
 * Sanitises the `next` parameter the api client attaches when it ends an
 * expired session, before it is used as a post-login destination.
 *
 * Anything that is not a plain same-origin path falls back to the console's
 * home. A protocol-relative value like `//evil.example` is a same-origin path
 * to `startsWith("/")` but a cross-origin URL to the browser, so it is rejected
 * explicitly — otherwise a crafted link would turn the login form into an open
 * redirect.
 */
export function safeNext(raw: string | null | undefined): string {
  const fallback = "/colleges";
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  // Bouncing back to /login would loop the user straight back here.
  return raw.startsWith("/login") ? fallback : raw;
}
