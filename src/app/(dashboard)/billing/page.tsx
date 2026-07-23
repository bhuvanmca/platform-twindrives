import { FeatureUnavailable } from "@/components/FeatureUnavailable";

// Backend has no billing subsystem — see git history for the data-driven
// version to restore once /platform/billing exists.
export default function BillingPage() {
  return (
    <FeatureUnavailable
      title="Billing"
      subtitle="Manage college subscriptions and plans"
      note="Billing isn't connected to the backend yet."
    />
  );
}
