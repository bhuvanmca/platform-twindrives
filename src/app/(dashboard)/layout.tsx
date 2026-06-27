"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  BarChart3,
  CreditCard,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/colleges", label: "Colleges", icon: Building2 },
  { href: "/admins", label: "Admin Users", icon: Users },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("platform_token");
    if (!token) router.replace("/login");
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("platform_token");
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-sidebar text-sidebar-foreground shrink-0">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">TwinDrives</p>
              <p className="text-xs text-sidebar-muted-foreground">Platform Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
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

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
