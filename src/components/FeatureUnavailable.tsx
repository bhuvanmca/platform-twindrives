import { Wrench } from "lucide-react";

// Placeholder for platform-console features whose backend endpoints do not exist
// yet (auth-service exposes only /platform/auth/* and /platform/colleges). These
// pages previously called 404 routes and crashed; this keeps them navigable and
// inert until the backend implements the corresponding endpoints. The original
// data-driven implementations remain in git history.
export function FeatureUnavailable({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle?: string;
  note?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center h-64 text-gray-400 px-6 text-center">
        <Wrench className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium text-gray-500">Coming soon</p>
        <p className="text-xs mt-1 max-w-sm">
          {note ?? "This feature isn't available yet."}
        </p>
      </div>
    </div>
  );
}
