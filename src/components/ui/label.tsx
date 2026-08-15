"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-sm font-medium text-foreground leading-none select-none group-data-[disabled=true]:opacity-60",
        className
      )}
      {...props}
    />
  );
}

/** Label + control + optional hint/error, with the wiring done once. */
function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { Label, Field };
