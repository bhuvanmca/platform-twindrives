import { FeatureUnavailable } from "@/components/FeatureUnavailable";

// Backend has no /platform/stats endpoint yet — see git history for the
// chart-driven version to restore once auth-service exposes it.
export default function StatsPage() {
  return (
    <FeatureUnavailable
      title="Platform Statistics"
      subtitle="Overview across all colleges"
      note="Aggregated platform statistics aren't connected to the backend yet."
    />
  );
}
