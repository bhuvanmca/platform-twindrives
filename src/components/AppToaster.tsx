"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/ThemeProvider";

// Sonner's own `theme="system"` reads prefers-color-scheme directly, which
// would ignore an explicit Light/Dark choice made in the app. Feed it the
// resolved theme instead so toasts always match the surface behind them.
export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
