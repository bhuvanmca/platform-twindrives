"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api";

interface AuditEntry {
  id: number;
  actor_id: number | null;
  action: string; // e.g. "POST /api/v1/platform/colleges/3/admins"
  created_at: string;
}

const METHOD_COLORS: Record<string, string> = {
  POST: "bg-green-100 text-green-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-600",
};

// Turn "POST /api/v1/platform/colleges/3/admins" into a method + a short path.
function parseAction(action: string) {
  const [method, ...rest] = action.split(" ");
  const path = (rest.join(" ") || "").replace("/api/v1/platform", "") || "/";
  return { method, path };
}

export default function ActivityPage() {
  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit"],
    queryFn: () => api.get("/platform/audit").then((r) => r.data.entries ?? []),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Every change made through the platform console
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <ScrollText className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No activity recorded yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entries.map((e) => {
              const { method, path } = parseAction(e.action);
              return (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`inline-flex justify-center min-w-[52px] px-2 py-0.5 rounded text-xs font-semibold ${
                      METHOD_COLORS[method] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {method}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 font-mono truncate">
                    {path}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(e.created_at).toLocaleString("en-IN")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
