import type { Metadata } from "next";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TwinDrives Platform",
  description: "Platform management for TwinDrives colleges",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* React Query cache is shared across the whole app (was previously
            re-created per page); toasts are mounted once here. */}
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
