import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-subtle text-primary",
        neutral: "border-transparent bg-muted text-muted-foreground",
        success: "border-transparent bg-success-subtle text-success",
        warning: "border-transparent bg-warning-subtle text-warning-foreground",
        destructive:
          "border-transparent bg-destructive-subtle text-destructive",
        info: "border-transparent bg-info-subtle text-info",
        outline: "border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Small coloured dot + label, for statuses that read better than a pill. */
function StatusDot({
  variant = "neutral",
  className,
}: {
  variant?: "success" | "warning" | "destructive" | "neutral" | "info";
  className?: string;
}) {
  const tone = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
    neutral: "bg-muted-foreground",
  }[variant];
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 rounded-full", tone, className)}
    />
  );
}

export { Badge, StatusDot, badgeVariants };
