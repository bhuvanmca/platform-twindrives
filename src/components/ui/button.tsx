"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Shared: every button gets the same focus ring, disabled treatment and icon
  // sizing so they cannot drift apart across pages.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,box-shadow,background-color,border-color] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:translate-y-px",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-accent active:translate-y-px",
        outline:
          "border border-border bg-card text-foreground shadow-xs hover:bg-accent hover:border-border-strong active:translate-y-px",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:brightness-110 active:translate-y-px",
        "destructive-ghost":
          "text-muted-foreground hover:bg-destructive-subtle hover:text-destructive",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9.5 px-4",
        lg: "h-11 px-6",
        icon: "size-9 p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Swaps the leading icon for a spinner and blocks interaction. */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
