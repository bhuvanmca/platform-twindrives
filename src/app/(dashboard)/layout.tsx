"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  CreditCard,
  HardDrive,
  UserCog,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { clearSession, getToken } from "@/lib/session";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/colleges", label: "Colleges", icon: Building2 },
  { href: "/admins", label: "Admin Users", icon: UserCog },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
  { href: "/storage", label: "Storage", icon: HardDrive },
  { href: "/activity", label: "Activity", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface PlatformUser {
  id: number;
  email: string;
  name?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // Validate the session for real rather than trusting the token string. A 401
    // is handled by the api interceptor (refresh, then sign-out); anything else
    // — the endpoint missing, the service down — is surfaced instead of being
    // swallowed, which previously left the sidebar blank with no explanation.
    api
      .get("/platform/auth/me")
      .then((r) => {
        setUser(r.data);
        setAuthError(null);
      })
      .catch((err) => {
        if (err?.response?.status === 401) return;
        setAuthError(
          err?.response?.status
            ? `Could not verify your session (HTTP ${err.response.status}).`
            : "Could not reach the platform API to verify your session."
        );
      });
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  const sidebar = (
    <aside className="w-64 h-full flex flex-col bg-sidebar text-sidebar-foreground shrink-0">
      <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">TwinDrives</p>
            <p className="text-xs text-sidebar-muted-foreground">Platform Admin</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-sidebar-muted-foreground hover:text-sidebar-foreground"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium leading-tight truncate">
              {user.name || "Platform Owner"}
            </p>
            <p className="text-xs text-sidebar-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 px-4 md:px-8 h-14 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-foreground">TwinDrives</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        {authError && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 md:px-8 py-2 bg-warning-subtle text-warning-strong text-sm border-b border-border"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{authError} Some data on this page may be unavailable.</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
