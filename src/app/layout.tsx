import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppToaster } from "@/components/AppToaster";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

// Loaded as a CSS variable so `--font-sans` in globals.css can reference it and
// every surface inherits the same typeface (previously the app fell back to
// whatever system-ui resolved to, which is why it read as unstyled).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TwinDrives Platform",
    template: "%s · TwinDrives Platform",
  },
  description: "Platform management for TwinDrives colleges",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14161f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: ThemeProvider's pre-paint script sets the
    // `class`/`style` on <html> before React hydrates.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        {/* React Query cache is shared across the whole app (was previously
            re-created per page); toasts are mounted once here. */}
        <ThemeProvider>
          <QueryProvider>
            {children}
            <AppToaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
