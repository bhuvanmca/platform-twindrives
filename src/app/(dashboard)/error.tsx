"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

// Route-level error boundary for the dashboard. Turns an unexpected render/data
// error into a friendly retry card instead of a blank "This page couldn't load".
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        This page hit an unexpected error. You can retry, or head back to the
        colleges list.
      </p>
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
      >
        <RotateCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
