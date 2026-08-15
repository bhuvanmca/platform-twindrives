"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-input bg-card text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      // Some autofill extensions inject an `fdprocessedid` attribute before
      // hydration; ignore the resulting attribute mismatch.
      suppressHydrationWarning
      className={cn(fieldBase, "h-9.5 px-3 py-2", className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      suppressHydrationWarning
      className={cn(fieldBase, "min-h-20 px-3 py-2 resize-y", className)}
      {...props}
    />
  );
}

export { Input, Textarea, fieldBase };
