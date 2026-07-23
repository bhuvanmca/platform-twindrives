"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IndianRupee,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  BellRing,
  History,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  getInvoices,
  markInvoicePaid,
  inr,
  fmtDate,
  INVOICE_STATUS_META,
  type Invoice,
  type InvoiceStatus,
  type DemoCollege,
} from "@/lib/demo";
import { openInvoicePdf } from "@/lib/invoice";
import { downloadCsv } from "@/lib/export";

interface College {
  id: number;
  name: string;
  created_at?: string;
}

function unwrap(data: unknown): College[] {
  if (Array.isArray(data)) return data as College[];
  const c = (data as { colleges?: College[] })?.colleges;
  return Array.isArray(c) ? c : [];
}

const STATUS_FILTERS: (InvoiceStatus | "All")[] = [
  "All",
  "Paid",
  "Pending",
  "Due Soon",
  "Overdue",
];

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">("All");
  const [historyFor, setHistoryFor] = useState<DemoCollege | null>(null);

  const { data: colleges = [], isLoading } = useQuery({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => unwrap(r.data)),
  });

  // One "current" invoice per college, plus a lookup of full history.
  const { rows, totals } = useMemo(() => {
    const rows = colleges.map((c) => {
      const invoices = getInvoices(c);
      return { college: c as DemoCollege, current: invoices[0], invoices };
    });
    const totals = rows.reduce(
      (acc, r) => {
        acc.billed += r.current.finalAmount;
        if (r.current.status === "Paid") acc.collected += r.current.finalAmount;
        else acc.outstanding += r.current.finalAmount;
        if (r.current.status === "Overdue") acc.overdue += 1;
        return acc;
      },
      { billed: 0, collected: 0, outstanding: 0, overdue: 0 }
    );
    return { rows, totals };
  }, [colleges]);

  const filtered = rows.filter((r) => {
    const matchesQ = r.college.name.toLowerCase().includes(q.toLowerCase());
    const matchesS = statusFilter === "All" || r.current.status === statusFilter;
    return matchesQ && matchesS;
  });

  const payMutation = useMutation({
    mutationFn: async (number: string) => markInvoicePaid(number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.success("Invoice marked as paid");
    },
  });

  const cards = [
    { label: "Billed (current cycle)", value: inr(totals.billed), icon: IndianRupee, tint: "text-primary bg-primary/10" },
    { label: "Collected", value: inr(totals.collected), icon: CheckCircle2, tint: "text-green-600 bg-green-100" },
    { label: "Outstanding", value: inr(totals.outstanding), icon: Clock, tint: "text-orange-600 bg-orange-100" },
    { label: "Overdue accounts", value: String(totals.overdue), icon: AlertTriangle, tint: "text-red-600 bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Subscriptions, invoices and payment status across all colleges
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{c.label}</span>
              <div className={`p-2 rounded-lg ${c.tint}`}>
                <c.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search colleges…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                statusFilter === s
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            downloadCsv(
              "billing",
              [
                { key: "number", label: "Invoice" },
                { key: "collegeName", label: "College" },
                { key: "planName", label: "Plan" },
                { key: "licensedUsers", label: "Users" },
                { key: "finalAmount", label: "Amount" },
                { key: "status", label: "Status" },
                { key: "due", label: "Due" },
              ],
              filtered.map((r) => ({
                ...r.current,
                due: fmtDate(r.current.dueDate),
              })) as unknown as Record<string, unknown>[]
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">College</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium text-right">Users</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No matching invoices
                  </td>
                </tr>
              ) : (
                filtered.map(({ college, current, invoices }) => (
                  <tr key={college.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{college.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{current.number}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{current.planName}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                      {current.licensedUsers}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-900">
                      {inr(current.finalAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_META[current.status]}`}
                      >
                        {current.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(current.dueDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {current.status !== "Paid" && (
                          <button
                            onClick={() => payMutation.mutate(current.number)}
                            title="Mark as paid"
                            className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {current.status !== "Paid" && (
                          <button
                            onClick={() => toast.success(`Reminder sent to ${college.name}`)}
                            title="Send reminder"
                            className="p-1.5 rounded-md text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                          >
                            <BellRing className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openInvoicePdf(current)}
                          title="Download invoice (PDF)"
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setHistoryFor(college)}
                          title="Billing history"
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {/* keep full history reachable for the modal */}
                        <span className="hidden">{invoices.length}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyFor && (
        <BillingHistoryDialog
          college={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}

function BillingHistoryDialog({
  college,
  onClose,
}: {
  college: DemoCollege;
  onClose: () => void;
}) {
  const invoices: Invoice[] = getInvoices(college);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Billing history</h2>
            <p className="text-xs text-gray-500">{college.name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-gray-50">
          {invoices.map((inv) => (
            <div key={inv.number} className="flex items-center gap-3 px-6 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 font-mono">{inv.number}</p>
                <p className="text-xs text-gray-400">
                  {fmtDate(inv.invoiceDate)} · {inv.planName} · {inv.licensedUsers} users
                </p>
              </div>
              <span className="text-sm font-medium text-gray-900 tabular-nums">
                {inr(inv.finalAmount)}
              </span>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_META[inv.status]}`}
              >
                {inv.status}
              </span>
              <button
                onClick={() => openInvoicePdf(inv)}
                title="Download (PDF)"
                className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
