"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  // No `mounted` flag needed: useTheme is backed by useSyncExternalStore, so
  // the first (hydrating) render already uses the server snapshot and React
  // swaps in the stored preference right after.
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          {resolvedTheme === "dark" ? (
            <Moon className="size-4.5" />
          ) : (
            <Sun className="size-4.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className={cn(theme === value && "text-foreground font-medium")}
          >
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
