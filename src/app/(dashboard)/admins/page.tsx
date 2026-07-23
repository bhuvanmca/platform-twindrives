import { FeatureUnavailable } from "@/components/FeatureUnavailable";

// Backend has no /platform/admins endpoints yet — see git history for the
// data-driven version to restore once auth-service exposes them.
export default function AdminsPage() {
  return (
    <FeatureUnavailable
      title="Admin Users"
      subtitle="Manage college administrators"
      note="Admin-user management isn't connected to the backend yet."
    />
  );
}
