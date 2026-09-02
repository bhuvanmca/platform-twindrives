import { FlaskConical } from "lucide-react";

/**
 * Marks UI whose numbers come from `src/lib/demo.ts` rather than the API.
 *
 * Billing, storage and subscription have no backend yet, so those pages render
 * deterministic fabricated data. Without a marker they are indistinguishable
 * from the pages that *are* live (Colleges, Statistics, Activity) — which is a
 * good way for someone to act on an invoice that does not exist.
 */
export function DemoBadge({
  label = "Demo data",
  detail = "No backend exists for this yet — these figures are generated locally and any changes are saved only in this browser.",
  className = "",
}: {
  label?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <span
      title={detail}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-warning-strong/30 bg-warning-subtle text-warning-strong text-xs font-medium ${className}`}
    >
      <FlaskConical className="w-3 h-3 shrink-0" aria-hidden />
      {label}
      <span className="sr-only">. {detail}</span>
    </span>
  );
}
