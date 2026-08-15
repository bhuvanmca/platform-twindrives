"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Built on a native checkbox rather than Radix — @radix-ui/react-switch and
// react-checkbox are not dependencies, and the native input keeps form
// semantics (name/required/labels) for free.

function Switch({
  className,
  label,
  description,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "group flex items-start gap-3",
        props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
    >
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          suppressHydrationWarning
          {...props}
        />
        <span
          aria-hidden
          className="block h-5 w-9 rounded-full bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 size-4 rounded-full bg-card shadow-xs transition-transform peer-checked:translate-x-4"
        />
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-sm font-medium text-foreground leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-xs text-muted-foreground mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

function Checkbox({
  className,
  label,
  description,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "group flex items-start gap-2.5",
        props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
    >
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          suppressHydrationWarning
          {...props}
        />
        <span
          aria-hidden
          className="flex size-4.5 items-center justify-center rounded-[5px] border border-border-strong bg-card transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
        >
          {/* group-has-, not peer-checked-: the icon is a descendant of the
              box, not a sibling of the input. */}
          <Check className="size-3 text-primary-foreground opacity-0 transition-opacity group-has-checked:opacity-100" />
        </span>
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-sm text-foreground leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-xs text-muted-foreground mt-0.5">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

export { Switch, Checkbox };
