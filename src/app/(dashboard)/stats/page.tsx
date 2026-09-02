"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  GraduationCap,
  Zap,
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
import { CHART, axisTick, tooltipProps } from "@/lib/chart";

interface PlatformStats {
  total_colleges: number;
  active_colleges: number;
  total_students: number;
  total_drives: number;
  active_drives: number;
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
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const { data: stats, isLoading, isError, refetch } = useQuery<PlatformStats>({
    queryKey: ["platform-stats"],
    queryFn: () => api.get("/platform/stats").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading statistics…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-destructive text-sm">
        <p>Could not load platform statistics.</p>
        <button onClick={() => refetch()} className="text-primary hover:underline">Try again</button>
      </div>
    );
  }

  const s: PlatformStats = stats ?? {
    total_colleges: 0,
    active_colleges: 0,
    total_students: 0,
    total_drives: 0,
    active_drives: 0,
    total_placements: 0,
    placement_rate: 0,
    colleges_monthly: [],
    placements_monthly: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Statistics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview across all colleges</p>
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
          sub={`${s.active_drives} open`}
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
          label="Active Drives"
          value={s.active_drives.toLocaleString()}
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Colleges Onboarded (Monthly)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.colleges_monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="month" tick={axisTick()} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick()} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="colleges" fill={CHART.series[0]} radius={4} name="Colleges" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Placements (Monthly)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.placements_monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="month" tick={axisTick()} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick()} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="placements" fill={CHART.series[1]} radius={4} name="Placements" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
