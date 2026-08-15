"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "twindrives_theme";

interface ThemeContextValue {
  /** What the user picked — may be "system". */
  theme: Theme;
  /** What is actually painted right now. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Runs before first paint so the correct palette is on <html> when the page
 * renders — without it the app flashes light before hydration. Kept as a string
 * because it must execute synchronously, ahead of React.
 */
const NO_FLASH_SCRIPT = `
(function(){try{
  var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"system";
  var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark",d);
  document.documentElement.style.colorScheme=d?"dark":"light";
}catch(e){}})();
`;

/* -------------------------------------------------------------------------
   The preference lives in localStorage and the OS, both external to React, so
   it is read through useSyncExternalStore rather than mirrored into state in
   an effect. This also gives correct hydration for free: the server snapshot
   renders first, then React re-renders with the real stored value.
   ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function darkQuery() {
  return window.matchMedia("(prefers-color-scheme: dark)");
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = darkQuery();
  // `storage` keeps other tabs in sync; `change` follows the OS on "system".
  window.addEventListener("storage", onChange);
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onChange);
  };
}

function getTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
  }
}

function getResolved(): "light" | "dark" {
  const t = getTheme();
  return t === "dark" || (t === "system" && darkQuery().matches)
    ? "dark"
    : "light";
}

// Snapshots are primitives, so returning a fresh value each call is safe.
const serverTheme = (): Theme => "system";
const serverResolved = (): "light" | "dark" => "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, serverTheme);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getResolved,
    serverResolved
  );

  // Push the resolved theme out to the DOM — an external system, which is what
  // effects are for. The no-flash script covers the very first paint.
  useEffect(() => {
    const dark = resolvedTheme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled — the choice just won't persist.
    }
    emit();
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <script
        dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}
        suppressHydrationWarning
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
