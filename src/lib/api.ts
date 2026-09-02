import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearSession,
  getRefreshToken,
  getToken,
  setSession,
} from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Marks a request that has already been replayed once, so a second 401 on the
// retry ends the session instead of looping.
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// auth-service does NOT currently expose this (verified 2026-09-02 against
// auth-service/internal/routes/routes.go): the platform surface is login / me /
// password only, PlatformLogin returns no refresh token, and the access token
// is deliberately short-lived at 8h. The renewal path below is therefore inert
// today and falls straight through to endSession() — it starts working the day
// the service issues a platform refresh token, with no frontend change.
const REFRESH_PATH = "/platform/auth/refresh";

// Concurrent requests that all 401 at once share one refresh call rather than
// firing N of them and racing to write the result.
let refreshInFlight: Promise<string | null> | null = null;

async function requestNewToken(): Promise<string | null> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return null;
  try {
    // A bare axios call: the instance's interceptors would attach the dead
    // access token and recurse back into this handler.
    const res = await axios.post(`${BASE_URL}${REFRESH_PATH}`, {
      refresh_token,
    });
    const token: string | undefined = res.data?.token ?? res.data?.access_token;
    if (!token) return null;
    setSession({ token, refresh_token: res.data?.refresh_token ?? refresh_token });
    return token;
  } catch {
    // No refresh endpoint, or the refresh token is spent — fall through to
    // ending the session.
    return null;
  }
}

function refreshToken(): Promise<string | null> {
  refreshInFlight ??= requestNewToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// Ends the session and sends the user to /login with enough context for the
// login page to explain what happened and put them back where they were —
// without it an expiring token just teleports you to a blank login form
// mid-task, which is what an 8h token guarantees at least once a working day.
function endSession() {
  clearSession();
  if (typeof window === "undefined") return;
  const { pathname, search, hash } = window.location;
  if (pathname === "/login") return;
  const next = encodeURIComponent(`${pathname}${search}${hash}`);
  window.location.href = `/login?expired=1&next=${next}`;
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as RetriableConfig | undefined;
    const isAuthFailure = err.response?.status === 401;
    const isRefreshCall = config?.url?.includes(REFRESH_PATH);

    if (!isAuthFailure || !config || config._retried || isRefreshCall) {
      if (isAuthFailure) endSession();
      return Promise.reject(err);
    }

    const token = await refreshToken();
    if (!token) {
      endSession();
      return Promise.reject(err);
    }

    config._retried = true;
    config.headers.Authorization = `Bearer ${token}`;
    return api.request(config);
  }
);
