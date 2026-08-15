"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, ShieldCheck, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Matches auth-service models.User rows returned by
// GET /platform/colleges/:id/admins → { admins: [...] }.
interface CollegeStaff {
  id: number;
  email: string;
  role: string;
  name: string | null;
  college_id: number;
  is_active: boolean;
  created_at: string;
}

interface AdminFormData {
  name: string;
  email: string;
  role: "admin" | "super_admin";
  password: string;
}

const emptyForm: AdminFormData = {
  name: "",
  email: "",
  role: "admin",
  password: "",
};

function apiError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response?: { data?: { error?: string } } }).response;
    if (resp?.data?.error) return resp.data.error;
  }
  return fallback;
}

export function CollegeAdminsDialog({
  college,
  onClose,
}: {
  college: { id: number; name: string };
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminFormData>(emptyForm);
  const [error, setError] = useState("");
  const key = ["college-admins", college.id];

  const { data: admins = [], isLoading } = useQuery<CollegeStaff[]>({
    queryKey: key,
    queryFn: () =>
      api
        .get(`/platform/colleges/${college.id}/admins`)
        .then((r) => r.data.admins ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data: AdminFormData) =>
      api
        .post(`/platform/colleges/${college.id}/admins`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      setForm(emptyForm);
      setError("");
      toast.success("Admin created");
    },
    onError: (err) => setError(apiError(err, "Failed to create admin")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api
        .delete(`/platform/colleges/${college.id}/admins/${id}`)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast.success("Admin removed");
    },
    onError: (err) => toast.error(apiError(err, "Failed to remove admin")),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Admins</h2>
            <p className="text-xs text-muted-foreground">{college.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Existing staff */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Loading…
              </div>
            ) : admins.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Users className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No admins yet for this college</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/50 transition">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {a.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-primary">
                          {a.role === "super_admin" ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                          <span className="text-xs font-medium">
                            {a.role === "super_admin" ? "Super Admin" : "Admin"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${a.name ?? a.email}?`))
                                deleteMutation.mutate(a.id);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-subtle rounded-lg transition"
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

          {/* Create form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="space-y-4 border-t border-border pt-5"
          >
            <h3 className="text-sm font-semibold text-foreground">Add an admin</h3>
            {error && (
              <p className="text-sm text-destructive bg-destructive-subtle rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Placement Officer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Role *
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as AdminFormData["role"] })
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-card"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="placement@college.edu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Temporary Password *
                </label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {createMutation.isPending ? "Creating…" : "Create Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
