"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { QueryProvider } from "@/components/QueryProvider";

interface College {
  id: string;
  name: string;
  code: string;
  domain: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  state: string;
  active: boolean;
  created_at: string;
}

interface CollegeFormData {
  name: string;
  code: string;
  domain: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  state: string;
}

const emptyForm: CollegeFormData = {
  name: "",
  code: "",
  domain: "",
  contact_email: "",
  contact_phone: "",
  city: "",
  state: "",
};

function CollegesContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [form, setForm] = useState<CollegeFormData>(emptyForm);

  const { data: colleges = [], isLoading } = useQuery<College[]>({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CollegeFormData) =>
      api.post("/platform/colleges", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CollegeFormData }) =>
      api.put(`/platform/colleges/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["colleges"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/platform/colleges/${id}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["colleges"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(college: College) {
    setEditing(college);
    setForm({
      name: college.name,
      code: college.code,
      domain: college.domain,
      contact_email: college.contact_email,
      contact_phone: college.contact_phone,
      city: college.city,
      state: college.state,
    });
    setShowDialog(true);
  }

  function closeDialog() {
    setShowDialog(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <p className="text-sm">No colleges found</p>
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
                  Location
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
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
                    <div className="font-medium text-gray-900">
                      {college.name}
                    </div>
                    <div className="text-xs text-gray-400">{college.domain}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{college.code}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {college.city}, {college.state}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {college.contact_email}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        college.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {college.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(college)}
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

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              {editing ? "Edit College" : "Add College"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    College Name *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Kongu Engineering College"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="KEC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain
                  </label>
                  <input
                    value={form.domain}
                    onChange={(e) =>
                      setForm({ ...form, domain: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="kongu.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.contact_email}
                    onChange={(e) =>
                      setForm({ ...form, contact_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="principal@kongu.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    value={form.contact_phone}
                    onChange={(e) =>
                      setForm({ ...form, contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Erode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Tamil Nadu"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {isPending ? "Saving…" : editing ? "Update" : "Add College"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollegesPage() {
  return (
    <QueryProvider>
      <CollegesContent />
    </QueryProvider>
  );
}
