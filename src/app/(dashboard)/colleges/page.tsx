"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Search,
  Users,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CollegeAdminsDialog } from "@/components/CollegeAdminsDialog";
import { PLANS, inr } from "@/lib/demo";

// The college admin app the platform owner is handed off into when opening a
// college's dashboard. This must point at the CI-maintained admin worker (the
// monorepo's admin-web-deploy publishes to the developer-6ef account, which is
// where the /sso hand-off route lives). Overridable per-environment.
const ADMIN_APP_URL =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL ||
  "https://admin-twindrives.developer-6ef.workers.dev";

// Matches auth-service models.College (GET /platform/colleges → { colleges: [...] }).
interface College {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
  email_domain: string | null;
  is_active: boolean;
  created_at: string;
}

// Matches auth-service models.CollegeInput (create/update payload).
interface CollegeFormData {
  name: string;
  code: string;
  email_domain: string;
  logo_url: string;
  is_active: boolean;
}

const emptyForm: CollegeFormData = {
  name: "",
  code: "",
  email_domain: "",
  logo_url: "",
  is_active: true,
};

// Onboarding sections (only used when creating). Admin is submitted for real;
// subscription & storage are captured as demo configuration.
const emptyAdmin = {
  name: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  role: "super_admin" as "admin" | "super_admin",
  sendCreds: true,
  forceChange: true,
};
const emptySub = {
  planId: PLANS[0].id,
  billingCycle: "Yearly",
  costPerUser: PLANS[0].costPerUser,
  maxUsers: 500,
  autoRenew: true,
};
const emptyStore = {
  allocatedGB: 100,
  maxUploadMB: 100,
  warningPct: 70,
  criticalPct: 90,
};
const emptyContact = { address: "", contactPerson: "", phone: "" };

// The list endpoint wraps the array as { colleges: [...] }; tolerate a bare
// array too so a future contract change doesn't crash the page.
function unwrapColleges(data: unknown): College[] {
  if (Array.isArray(data)) return data as College[];
  if (data && typeof data === "object" && Array.isArray((data as { colleges?: unknown }).colleges)) {
    return (data as { colleges: College[] }).colleges;
  }
  return [];
}

function toPayload(form: CollegeFormData) {
  return {
    name: form.name,
    code: form.code,
    email_domain: form.email_domain.trim() || null,
    logo_url: form.logo_url.trim() || null,
    is_active: form.is_active,
  };
}

function errMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const e = (err as { response?: { data?: { error?: string } } }).response
      ?.data?.error;
    if (e) return e;
  }
  return fallback;
}

function CollegesContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [managing, setManaging] = useState<College | null>(null);
  const [form, setForm] = useState<CollegeFormData>(emptyForm);
  const [admin, setAdmin] = useState(emptyAdmin);
  const [sub, setSub] = useState(emptySub);
  const [store, setStore] = useState(emptyStore);
  const [contact, setContact] = useState(emptyContact);
  const [creating, setCreating] = useState(false);

  const { data: colleges = [], isLoading } = useQuery<College[]>({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => unwrapColleges(r.data)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CollegeFormData }) =>
      api.put(`/platform/colleges/${id}`, toPayload(data)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.success("College updated");
      closeDialog();
    },
    onError: (err) => toast.error(errMessage(err, "Failed to update college")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/platform/colleges/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.success("College removed");
    },
    onError: (err) => toast.error(errMessage(err, "Failed to remove college")),
  });

  // Open a college's own dashboard as its super_admin, without that college's
  // password. The backend mints a college token; we hand it to the admin app
  // via the URL fragment (never sent to any server) and redirect there.
  const impersonateMutation = useMutation({
    mutationFn: (id: number) =>
      api
        .post(`/platform/colleges/${id}/impersonate`)
        .then((r) => r.data as { token: string; refresh_token?: string }),
    onSuccess: (data) => {
      const frag = new URLSearchParams();
      frag.set("token", data.token);
      if (data.refresh_token) frag.set("refresh", data.refresh_token);
      window.location.href = `${ADMIN_APP_URL}/sso#${frag.toString()}`;
    },
    onError: (err) =>
      toast.error(errMessage(err, "Could not open this college's dashboard.")),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setAdmin(emptyAdmin);
    setSub(emptySub);
    setStore(emptyStore);
    setContact(emptyContact);
    setShowDialog(true);
  }

  function openEdit(college: College) {
    setEditing(college);
    setForm({
      name: college.name,
      code: college.code,
      email_domain: college.email_domain ?? "",
      logo_url: college.logo_url ?? "",
      is_active: college.is_active,
    });
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditing(null);
    setForm(emptyForm);
  }

  // Create the college for real, then (if provided) its first admin. Subscription
  // and storage are captured as demo configuration.
  async function onboard() {
    setCreating(true);
    try {
      const created = await api
        .post("/platform/colleges", toPayload(form))
        .then((r) => r.data);
      let collegeId: number | undefined = created?.id ?? created?.college?.id;
      if (!collegeId) {
        const list = await api
          .get("/platform/colleges")
          .then((r) => unwrapColleges(r.data));
        collegeId = list.find((c) => c.code === form.code.toUpperCase())?.id;
      }
      if (collegeId && admin.email && admin.password) {
        try {
          await api.post(`/platform/colleges/${collegeId}/admins`, {
            name: admin.name,
            email: admin.email,
            role: admin.role,
            password: admin.password,
          });
        } catch (e) {
          toast.error(errMessage(e, "College created, but admin setup failed"));
        }
      }
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      toast.success(
        admin.email ? "College and administrator created" : "College created"
      );
      closeDialog();
    } catch (e) {
      toast.error(errMessage(e, "Failed to create college"));
    } finally {
      setCreating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      onboard();
    }
  }

  const q = search.toLowerCase();
  const filtered = colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.email_domain ?? "").toLowerCase().includes(q)
  );

  const isPending = creating || updateMutation.isPending;
  const selectedPlan = PLANS.find((p) => p.id === sub.planId) ?? PLANS[0];
  const subTotal = sub.maxUsers * sub.costPerUser;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colleges</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage all institutions on the platform
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Add College
        </button>
      </div>

      {/* Search */}
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Building2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">
              {search ? "No colleges match your search" : "No colleges yet"}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition"
              >
                <Plus className="w-4 h-4" />
                Add your first college
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  College
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Domain
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((college) => (
                <tr key={college.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <Link
                      href={`/colleges/${college.id}`}
                      className="font-medium text-gray-900 hover:text-primary hover:underline"
                    >
                      {college.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{college.code}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {college.email_domain ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        college.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {college.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => impersonateMutation.mutate(college.id)}
                        disabled={impersonateMutation.isPending}
                        title="Open this college's dashboard"
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition disabled:opacity-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setManaging(college)}
                        title="Manage admins"
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(college)}
                        title="Edit college"
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Remove ${college.name} from the platform?`
                            )
                          )
                            deleteMutation.mutate(college.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Manage admins drawer */}
      {managing && (
        <CollegeAdminsDialog
          college={{ id: managing.id, name: managing.name }}
          onClose={() => setManaging(null)}
        />
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Edit College" : "Onboard a College"}
              </h2>
              {!editing && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Set up the tenant, its first administrator, subscription and storage
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-7"
              id="onboard-form"
            >
              {/* Basic information */}
              <section className="space-y-4">
                <SectionTitle>Basic information</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>College name *</Label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD} placeholder="Kongu Engineering College" />
                  </div>
                  <div>
                    <Label>Code *</Label>
                    <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={FIELD} placeholder="KEC" />
                  </div>
                  <div>
                    <Label>Email domain</Label>
                    <input value={form.email_domain} onChange={(e) => setForm({ ...form, email_domain: e.target.value })} className={FIELD} placeholder="kongu.edu" />
                  </div>
                  {!editing && (
                    <>
                      <div>
                        <Label>Contact person</Label>
                        <input value={contact.contactPerson} onChange={(e) => setContact({ ...contact, contactPerson: e.target.value })} className={FIELD} placeholder="Principal / Placement Head" />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={FIELD} placeholder="+91 …" />
                      </div>
                      <div className="col-span-2">
                        <Label>Address</Label>
                        <input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} className={FIELD} placeholder="City, State" />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <Label>Logo URL</Label>
                    <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className={FIELD} placeholder="https://…/logo.png" />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/40" />
                      Active
                    </label>
                  </div>
                </div>
              </section>

              {!editing && (
                <>
                  {/* Administrator */}
                  <section className="space-y-4">
                    <SectionTitle>First administrator</SectionTitle>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Admin name</Label>
                        <input value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} className={FIELD} placeholder="Placement Officer" />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <select value={admin.role} onChange={(e) => setAdmin({ ...admin, role: e.target.value as "admin" | "super_admin" })} className={`${FIELD} bg-white`}>
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <input type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} className={FIELD} placeholder="placement@college.edu" />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <input value={admin.phone} onChange={(e) => setAdmin({ ...admin, phone: e.target.value })} className={FIELD} placeholder="+91 …" />
                      </div>
                      <div>
                        <Label>Username</Label>
                        <input value={admin.username} onChange={(e) => setAdmin({ ...admin, username: e.target.value })} className={FIELD} placeholder="placement.officer" />
                      </div>
                      <div>
                        <Label>Temporary password</Label>
                        <input type="text" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} className={FIELD} placeholder="Min. 6 characters" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">Leave email &amp; password blank to add the administrator later.</p>
                    <div className="flex flex-wrap gap-4">
                      <Check checked={admin.sendCreds} onChange={(v) => setAdmin({ ...admin, sendCreds: v })}>Send login credentials</Check>
                      <Check checked={admin.forceChange} onChange={(v) => setAdmin({ ...admin, forceChange: v })}>Force password change on first login</Check>
                    </div>
                  </section>

                  {/* Subscription */}
                  <section className="space-y-4">
                    <SectionTitle>Subscription</SectionTitle>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Plan</Label>
                        <select
                          value={sub.planId}
                          onChange={(e) => {
                            const p = PLANS.find((x) => x.id === e.target.value) ?? PLANS[0];
                            setSub({ ...sub, planId: p.id, costPerUser: p.costPerUser, maxUsers: Math.min(sub.maxUsers, p.maxUsers) });
                          }}
                          className={`${FIELD} bg-white`}
                        >
                          {PLANS.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — {p.blurb}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Billing cycle</Label>
                        <select value={sub.billingCycle} onChange={(e) => setSub({ ...sub, billingCycle: e.target.value })} className={`${FIELD} bg-white`}>
                          {["Monthly", "Quarterly", "Half-Yearly", "Yearly"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Cost per user (₹)</Label>
                        <input type="number" min={0} value={sub.costPerUser} onChange={(e) => setSub({ ...sub, costPerUser: Number(e.target.value) })} className={FIELD} />
                      </div>
                      <div>
                        <Label>Max licensed users</Label>
                        <input type="number" min={1} max={selectedPlan.maxUsers} value={sub.maxUsers} onChange={(e) => setSub({ ...sub, maxUsers: Number(e.target.value) })} className={FIELD} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div>
                        <Check checked={sub.autoRenew} onChange={(v) => setSub({ ...sub, autoRenew: v })}>Auto-renewal</Check>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total per cycle</p>
                        <p className="text-lg font-bold text-gray-900">{inr(subTotal)}</p>
                      </div>
                    </div>
                  </section>

                  {/* Storage */}
                  <section className="space-y-4">
                    <SectionTitle>Storage allocation</SectionTitle>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Allocated storage (GB)</Label>
                        <input type="number" min={1} value={store.allocatedGB} onChange={(e) => setStore({ ...store, allocatedGB: Number(e.target.value) })} className={FIELD} />
                      </div>
                      <div>
                        <Label>Max upload size (MB)</Label>
                        <input type="number" min={1} value={store.maxUploadMB} onChange={(e) => setStore({ ...store, maxUploadMB: Number(e.target.value) })} className={FIELD} />
                      </div>
                      <div>
                        <Label>Warning threshold (%)</Label>
                        <input type="number" min={1} max={100} value={store.warningPct} onChange={(e) => setStore({ ...store, warningPct: Number(e.target.value) })} className={FIELD} />
                      </div>
                      <div>
                        <Label>Critical threshold (%)</Label>
                        <input type="number" min={1} max={100} value={store.criticalPct} onChange={(e) => setStore({ ...store, criticalPct: Number(e.target.value) })} className={FIELD} />
                      </div>
                    </div>
                  </section>
                </>
              )}
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={closeDialog} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" form="onboard-form" disabled={isPending} className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60">
                {isPending ? "Saving…" : editing ? "Update" : "Create college"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FIELD =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 pb-2">
      {children}
    </h3>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/40" />
      {children}
    </label>
  );
}

export default function CollegesPage() {
  return <CollegesContent />;
}
