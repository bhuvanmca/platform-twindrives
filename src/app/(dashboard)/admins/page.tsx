"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { CollegeAdminsDialog } from "@/components/CollegeAdminsDialog";

interface College {
  id: number;
  name: string;
  code: string;
  email_domain: string | null;
  is_active: boolean;
}

function unwrapColleges(data: unknown): College[] {
  if (Array.isArray(data)) return data as College[];
  if (data && typeof data === "object") {
    const colleges = (data as { colleges?: unknown }).colleges;
    if (Array.isArray(colleges)) return colleges as College[];
  }
  return [];
}

export default function AdminsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<College | null>(null);
  const { data: colleges = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => unwrapColleges(r.data)),
  });

  const query = search.trim().toLowerCase();
  const filtered = colleges.filter(
    (college) =>
      college.name.toLowerCase().includes(query) ||
      college.code.toLowerCase().includes(query) ||
      (college.email_domain ?? "").toLowerCase().includes(query),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select a college to create or remove its administrators
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search colleges…" aria-label="Search colleges"
          className="w-full pl-9 pr-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Loading colleges…</div>
        ) : isError ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 text-sm text-destructive">
            <p>Could not load colleges.</p>
            <button className="text-primary hover:underline" onClick={() => refetch()}>Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <Building2 className="w-9 h-9 mb-2 opacity-30" />
            <p className="text-sm">{query ? "No colleges match your search" : "No colleges yet"}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((college) => (
              <li key={college.id} className="flex items-center gap-4 px-5 py-4">
                <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-4 h-4 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{college.name}</p>
                  <p className="text-xs text-muted-foreground">{college.code}{college.email_domain ? ` · ${college.email_domain}` : ""}</p>
                </div>
                <span className={`text-xs ${college.is_active ? "text-success" : "text-muted-foreground"}`}>{college.is_active ? "Active" : "Inactive"}</span>
                <button onClick={() => setSelected(college)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm font-medium hover:bg-accent/50">
                  <Users className="w-4 h-4" /> Manage admins
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected && <CollegeAdminsDialog college={{ id: selected.id, name: selected.name }} onClose={() => setSelected(null)} />}
    </div>
  );
}
