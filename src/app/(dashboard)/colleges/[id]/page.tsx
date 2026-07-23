"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Users,
  Power,
  Building2,
  GraduationCap,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";
import { CollegeAdminsDialog } from "@/components/CollegeAdminsDialog";

interface College {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
  email_domain: string | null;
  is_active: boolean;
  created_at: string;
}

interface CollegeStats {
  total_students: number;
  total_drives: number;
  active_drives: number;
  total_placements: number;
  placement_rate: number;
}

const ADMIN_APP_URL =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL ||
  "https://admin-twindrives.developer-6ef.workers.dev";

export default function CollegeDetailPage() {
  const params = useParams();
  const collegeId = Number(params.id);
  const queryClient = useQueryClient();
  const [managing, setManaging] = useState(false);

  const { data: colleges = [] } = useQuery<College[]>({
    queryKey: ["colleges"],
    queryFn: () =>
      api
        .get("/platform/colleges")
        .then((r) =>
          Array.isArray(r.data) ? r.data : r.data.colleges ?? []
        ),
  });
  const college = colleges.find((c) => c.id === collegeId);

  const { data: stats } = useQuery<CollegeStats>({
    queryKey: ["college-stats", collegeId],
    queryFn: () =>
      api.get(`/platform/colleges/${collegeId}/stats`).then((r) => r.data),
    enabled: !!collegeId,
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) =>
      api
        .post(
          `/platform/colleges/${collegeId}/${active ? "deactivate" : "activate"}`
        )
        .then((r) => r.data),
    onSuccess: (_d, active) => {
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.success(active ? "College deactivated" : "College activated");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to update college")),
  });

  const impersonate = useMutation({
    mutationFn: () =>
      api
        .post(`/platform/colleges/${collegeId}/impersonate`)
        .then((r) => r.data as { token: string; refresh_token?: string }),
    onSuccess: (d) => {
      const f = new URLSearchParams();
      f.set("token", d.token);
      if (d.refresh_token) f.set("refresh", d.refresh_token);
      window.location.href = `${ADMIN_APP_URL}/sso#${f.toString()}`;
    },
    onError: (err) =>
      toast.error(apiErrorMessage(err, "Could not open this college's dashboard.")),
  });

  if (!college) {
    return <div className="text-sm text-gray-400">Loading college…</div>;
  }

  const cards = [
    { label: "Students", value: stats?.total_students ?? 0, icon: GraduationCap, sub: undefined as string | undefined },
    { label: "Drives", value: stats?.total_drives ?? 0, icon: Briefcase, sub: `${stats?.active_drives ?? 0} open` },
    { label: "Placements", value: stats?.total_placements ?? 0, icon: Users, sub: undefined },
    { label: "Placement Rate", value: `${stats?.placement_rate ?? 0}%`, icon: TrendingUp, sub: undefined },
  ];

  const btn =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition";

  return (
    <div className="space-y-6">
      <Link
        href="/colleges"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Colleges
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
            {college.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={college.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{college.name}</h1>
            <p className="text-sm text-gray-500">
              {college.code}
              {college.email_domain ? ` · ${college.email_domain}` : ""}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              college.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {college.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => impersonate.mutate()}
            disabled={impersonate.isPending}
            className={`${btn} bg-primary text-white hover:bg-primary/90 disabled:opacity-60`}
          >
            <ExternalLink className="w-4 h-4" />
            Open dashboard
          </button>
          <button
            onClick={() => setManaging(true)}
            className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}
          >
            <Users className="w-4 h-4" />
            Manage admins
          </button>
          <button
            onClick={() => toggleMutation.mutate(college.is_active)}
            disabled={toggleMutation.isPending}
            className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60`}
          >
            <Power className="w-4 h-4" />
            {college.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{c.label}</span>
              <div className="p-2 rounded-lg bg-primary/10">
                <c.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{c.value}</p>
            {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {managing && (
        <CollegeAdminsDialog
          college={{ id: college.id, name: college.name }}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}
