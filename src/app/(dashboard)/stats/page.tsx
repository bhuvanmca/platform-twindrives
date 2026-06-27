"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  GraduationCap,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { QueryProvider } from "@/components/QueryProvider";

interface PlatformStats {
  total_colleges: number;
  active_colleges: number;
  total_students: number;
  total_drives: number;
  total_placements: number;
  placement_rate: number;
  colleges_monthly: { month: string; colleges: number }[];
  placements_monthly: { month: string; placements: number }[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg bg-${color}/10`}>
          <Icon className={`w-4 h-4 text-${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StatsContent() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ["platform-stats"],
    queryFn: () => api.get("/platform/stats").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading statistics…
      </div>
    );
  }

  const s = stats ?? {
    total_colleges: 0,
    active_colleges: 0,
    total_students: 0,
    total_drives: 0,
    total_placements: 0,
    placement_rate: 0,
    colleges_monthly: [],
    placements_monthly: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Statistics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview across all colleges
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total Colleges"
          value={s.total_colleges}
          icon={Building2}
          sub={`${s.active_colleges} active`}
        />
        <StatCard
          label="Total Students"
          value={s.total_students.toLocaleString()}
          icon={GraduationCap}
        />
        <StatCard
          label="Total Drives"
          value={s.total_drives.toLocaleString()}
          icon={Briefcase}
        />
        <StatCard
          label="Total Placements"
          value={s.total_placements.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Placement Rate"
          value={`${s.placement_rate}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Avg Placements / College"
          value={
            s.total_colleges
              ? Math.round(s.total_placements / s.total_colleges)
              : 0
          }
          icon={Award}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Colleges Onboarded (Monthly)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.colleges_monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="colleges" fill="oklch(0.39 0.14 264)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Placements (Monthly)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.placements_monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar
                dataKey="placements"
                fill="oklch(0.6 0.18 264)"
                radius={4}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <QueryProvider>
      <StatsContent />
    </QueryProvider>
  );
}
