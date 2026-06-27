"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Search, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { QueryProvider } from "@/components/QueryProvider";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  college_id: string;
  college_name: string;
  role: string;
  active: boolean;
  created_at: string;
}

interface College {
  id: string;
  name: string;
  code: string;
}

interface AdminFormData {
  name: string;
  email: string;
  college_id: string;
  password: string;
}

const emptyForm: AdminFormData = {
  name: "",
  email: "",
  college_id: "",
  password: "",
};

function AdminsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<AdminFormData>(emptyForm);

  const { data: admins = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["platform-admins"],
    queryFn: () => api.get("/platform/admins").then((r) => r.data),
  });

  const { data: colleges = [] } = useQuery<College[]>({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: AdminFormData) =>
      api.post("/platform/admins", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-admins"] });
      setShowDialog(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/platform/admins/${id}`).then((r) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform-admins"] }),
  });

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.college_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage college administrators
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search admins…"
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
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No admin users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  College
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">
                        {admin.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{admin.email}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {admin.college_name}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-primary">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium capitalize">
                        {admin.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        admin.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {admin.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (confirm(`Remove admin ${admin.name}?`))
                            deleteMutation.mutate(admin.id);
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

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              Add Admin User
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Placement Officer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="placement@college.edu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College *
                </label>
                <select
                  required
                  value={form.college_id}
                  onChange={(e) =>
                    setForm({ ...form, college_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                >
                  <option value="">Select college…</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password *
                </label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Min. 8 characters"
                  minLength={8}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setForm(emptyForm);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {createMutation.isPending ? "Creating…" : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminsPage() {
  return (
    <QueryProvider>
      <AdminsContent />
    </QueryProvider>
  );
}
