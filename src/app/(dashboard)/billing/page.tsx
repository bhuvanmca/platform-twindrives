"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle2, XCircle, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { QueryProvider } from "@/components/QueryProvider";

interface BillingRecord {
  id: string;
  college_id: string;
  college_name: string;
  plan: "starter" | "growth" | "enterprise";
  status: "active" | "expired" | "trial";
  amount: number;
  currency: string;
  valid_from: string;
  valid_until: string;
  seats: number;
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  growth: { label: "Growth", color: "bg-violet-100 text-violet-700" },
  enterprise: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  active: { label: "Active", icon: CheckCircle2, color: "text-green-600" },
  expired: { label: "Expired", icon: XCircle, color: "text-red-500" },
  trial: { label: "Trial", icon: RefreshCw, color: "text-blue-500" },
};

function BillingContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    college_id: "",
    plan: "starter" as BillingRecord["plan"],
    seats: 100,
    valid_until: "",
  });

  const { data: records = [], isLoading } = useQuery<BillingRecord[]>({
    queryKey: ["billing"],
    queryFn: () => api.get("/platform/billing").then((r) => r.data),
  });

  const { data: colleges = [] } = useQuery<{ id: string; name: string; code: string }[]>({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post("/platform/billing", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      setShowDialog(false);
    },
  });

  const renewMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/platform/billing/${id}/renew`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  });

  const filtered = records.filter((r) =>
    r.college_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage college subscriptions and plans
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
        >
          <CreditCard className="w-4 h-4" />
          Assign Plan
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search colleges…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <CreditCard className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No billing records found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">College</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seats</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valid Until</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((record) => {
                const plan = PLAN_LABELS[record.plan];
                const status = STATUS_LABELS[record.status];
                const StatusIcon = status?.icon;
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">{record.college_name}</td>
                    <td className="px-5 py-4">
                      {plan && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.color}`}>
                          {plan.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{record.seats}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {new Date(record.valid_until).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      ₹{record.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4">
                      {status && StatusIcon && (
                        <div className={`flex items-center gap-1.5 ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{status.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => renewMutation.mutate(record.id)}
                          disabled={renewMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition disabled:opacity-60"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renew
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Assign Plan</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
                <select
                  required
                  value={form.college_id}
                  onChange={(e) => setForm({ ...form, college_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                >
                  <option value="">Select college…</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan *</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value as BillingRecord["plan"] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Seats *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.seats}
                  onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                <input
                  type="date"
                  required
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {createMutation.isPending ? "Assigning…" : "Assign Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <QueryProvider>
      <BillingContent />
    </QueryProvider>
  );
}
