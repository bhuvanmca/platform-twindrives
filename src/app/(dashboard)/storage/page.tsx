"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  HardDrive,
  Database,
  Server,
  Files,
  Gauge,
  TrendingUp,
  Activity,
  Search,
  Download,
  Plus,
  Pause,
  Play,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  getPlatformStorage,
  getStorageRows,
  storageUsageSeries,
  fileTypeDistribution,
  getStorageAlerts,
  getStorageLogs,
  sampleLiveMetrics,
  setStorageAllocation,
  STORAGE_STATUS_META,
  ALERT_SEVERITY_META,
  type LiveMetrics,
  type DemoCollege,
} from "@/lib/demo";
import { downloadCsv } from "@/lib/export";

const PRIMARY = "oklch(0.39 0.14 264)";
const PRIMARY_LIGHT = "oklch(0.62 0.17 264)";
// Fixed categorical order (identity, never cycled) for file-type slices.
const CAT = ["#6366f1", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#94a3b8"];
const GRID = "#eef0f4";

const INTERVALS = [
  { label: "5s", ms: 5000 },
  { label: "10s", ms: 10000 },
  { label: "30s", ms: 30000 },
];

function unwrap(data: unknown): DemoCollege[] {
  if (Array.isArray(data)) return data as DemoCollege[];
  const c = (data as { colleges?: DemoCollege[] })?.colleges;
  return Array.isArray(c) ? c : [];
}

const gb = (n: number) => `${n.toLocaleString("en-IN")} GB`;

export default function StoragePage() {
  const [version, setVersion] = useState(0); // bump to recompute after allocation change
  const [intervalMs, setIntervalMs] = useState(5000);
  const [paused, setPaused] = useState(false);
  const [logQuery, setLogQuery] = useState("");

  const { data: colleges = [] } = useQuery({
    queryKey: ["colleges"],
    queryFn: () => api.get("/platform/colleges").then((r) => unwrap(r.data)),
  });

  const {
    platform,
    rows,
    usage,
    fileTypes,
    top,
    alloc,
    alerts,
    logs,
  } = useMemo(() => {
    const platform = getPlatformStorage(colleges);
    const rows = getStorageRows(colleges);
    const top = [...rows].sort((a, b) => b.usedGB - a.usedGB).slice(0, 10).map((r) => ({ name: r.name, used: r.usedGB }));
    const alloc = rows.map((r) => ({ name: r.name, used: r.usedGB, free: Math.max(0, r.allocatedGB - r.usedGB) }));
    return {
      platform,
      rows,
      usage: storageUsageSeries(colleges, 30),
      fileTypes: fileTypeDistribution(colleges),
      top,
      alloc,
      alerts: getStorageAlerts(colleges),
      logs: getStorageLogs(colleges, 80),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colleges, version]);

  // ---- live metrics feed ----
  const [metrics, setMetrics] = useState<LiveMetrics>(() => sampleLiveMetrics());
  const [history, setHistory] = useState<{ t: number; read: number; write: number }[]>([]);
  const tick = useRef(0);

  useEffect(() => {
    if (paused) return;
    const push = () => {
      const m = sampleLiveMetrics();
      setMetrics(m);
      tick.current += 1;
      setHistory((h) => [...h.slice(-29), { t: tick.current, read: m.readMBps, write: m.writeMBps }]);
    };
    push();
    const id = setInterval(push, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, paused]);

  const capacity = [
    { name: "Used", value: platform.usedGB, fill: PRIMARY },
    { name: "Allocated (free)", value: Math.max(0, platform.allocatedGB - platform.usedGB), fill: PRIMARY_LIGHT },
    { name: "Unallocated", value: Math.max(0, platform.capacityGB - platform.allocatedGB), fill: "#e5e7eb" },
  ];

  const overview = [
    { label: "Platform capacity", value: gb(platform.capacityGB), icon: Server },
    { label: "Allocated", value: gb(platform.allocatedGB), icon: Database },
    { label: "Used", value: gb(platform.usedGB), icon: HardDrive },
    { label: "Free", value: gb(platform.freeGB), icon: Gauge },
    { label: "Colleges", value: platform.colleges.toLocaleString("en-IN"), icon: Server },
    { label: "Files", value: platform.files.toLocaleString("en-IN"), icon: Files },
    { label: "Growth today", value: gb(platform.growthTodayGB), icon: TrendingUp },
    { label: "Growth this month", value: gb(platform.growthMonthGB), icon: TrendingUp },
  ];

  const liveTiles: { label: string; value: string }[] = [
    { label: "Read", value: `${metrics.readMBps} MB/s` },
    { label: "Write", value: `${metrics.writeMBps} MB/s` },
    { label: "Upload", value: `${metrics.uploadMBps} MB/s` },
    { label: "Download", value: `${metrics.downloadMBps} MB/s` },
    { label: "Active uploads", value: String(metrics.activeUploads) },
    { label: "Active downloads", value: String(metrics.activeDownloads) },
    { label: "Success rate", value: `${metrics.uploadSuccessRate}%` },
    { label: "Failed uploads", value: String(metrics.failedUploads) },
    { label: "Avg upload", value: `${metrics.avgUploadMB} MB` },
    { label: "API response", value: `${metrics.apiResponseMs} ms` },
    { label: "Storage latency", value: `${metrics.storageLatencyMs} ms` },
    { label: "Connections", value: String(metrics.activeConnections) },
    { label: "Disk IOPS", value: metrics.iops.toLocaleString("en-IN") },
    { label: "Queue length", value: String(metrics.queueLength) },
  ];

  function increaseStorage(collegeId: number, current: number, name: string) {
    setStorageAllocation(collegeId, current + 50);
    setVersion((v) => v + 1);
    toast.success(`${name} storage increased to ${current + 50} GB`);
  }

  const filteredLogs = logs.filter((l) => {
    const q = logQuery.toLowerCase();
    return (
      l.collegeName.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q) ||
      l.fileName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Infrastructure</p>
          <h1 className="text-2xl font-bold text-gray-900">Storage Monitoring</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time platform storage across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className={`w-2 h-2 rounded-full ${paused ? "bg-gray-400" : "bg-green-500 animate-pulse"}`} />
            {paused ? "Paused" : "Live"}
          </span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {INTERVALS.map((i) => (
              <button
                key={i.ms}
                onClick={() => setIntervalMs(i.ms)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  intervalMs === i.ms ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overview.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{c.label}</span>
              <c.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* live throughput + live tiles */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Throughput (live)
            </h3>
            <span className="text-xs text-gray-400">read vs write · MB/s</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gWrite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip isAnimationActive={false} />
              <Legend />
              <Area type="monotone" dataKey="read" stroke={PRIMARY} strokeWidth={2} fill="url(#gRead)" isAnimationActive={false} name="Read" />
              <Area type="monotone" dataKey="write" stroke="#14b8a6" strokeWidth={2} fill="url(#gWrite)" isAnimationActive={false} name="Write" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Live metrics</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {liveTiles.map((t) => (
              <div key={t.label}>
                <p className="text-xs text-gray-400">{t.label}</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* usage over time + capacity donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Storage usage over time (30d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={usage} margin={{ left: -12, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="used" stroke={PRIMARY} strokeWidth={2} fill="url(#gUsage)" name="Used (GB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Platform capacity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={capacity} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                {capacity.map((c, i) => (
                  <Cell key={i} fill={c.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* top colleges + file types */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top colleges by storage</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, top.length * 34)}>
            <BarChart data={top} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip />
              <Bar dataKey="used" fill={PRIMARY} radius={4} name="Used (GB)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">File type distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={fileTypes} dataKey="gb" nameKey="type" outerRadius={82} stroke="#fff" strokeWidth={2}>
                {fileTypes.map((_, i) => (
                  <Cell key={i} fill={CAT[i % CAT.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* allocation vs usage */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Allocation vs usage by college</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, alloc.length * 40)}>
          <BarChart data={alloc} layout="vertical" margin={{ left: 20, right: 16 }} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
            <Tooltip />
            <Legend />
            <Bar dataKey="used" stackId="a" fill={PRIMARY} name="Used (GB)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="free" stackId="a" fill="#e5e7eb" name="Free (GB)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* per-college table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">College storage</h3>
          <button
            onClick={() =>
              downloadCsv(
                "college-storage",
                [
                  { key: "name", label: "College" },
                  { key: "tenantId", label: "Tenant ID" },
                  { key: "allocatedGB", label: "Allocated (GB)" },
                  { key: "usedGB", label: "Used (GB)" },
                  { key: "remainingGB", label: "Remaining (GB)" },
                  { key: "usagePct", label: "Usage %" },
                  { key: "fileCount", label: "Files" },
                  { key: "status", label: "Status" },
                ],
                rows as unknown as Record<string, unknown>[]
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">College</th>
                <th className="px-5 py-2.5 font-medium">Tenant</th>
                <th className="px-5 py-2.5 font-medium">Usage</th>
                <th className="px-5 py-2.5 font-medium text-right">Files</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => {
                const meta = STORAGE_STATUS_META[r.status];
                return (
                  <tr key={r.collegeId} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{r.tenantId}</td>
                    <td className="px-5 py-3 w-64">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${r.usagePct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-gray-500 w-24 shrink-0">
                          {r.usedGB}/{r.allocatedGB} GB
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">
                      {r.fileCount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => increaseStorage(r.collegeId, r.allocatedGB, r.name)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> 50 GB
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* alerts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">Storage alerts</h3>
          <span className="text-xs text-gray-400">({alerts.length})</span>
        </div>
        {alerts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No active alerts</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {alerts.map((a) => {
              const meta = ALERT_SEVERITY_META[a.severity];
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{a.description}</p>
                    <p className="text-xs text-gray-400">{a.collegeName} · {a.time.toLocaleString("en-IN")}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>{meta.label}</span>
                  <span className="text-xs text-gray-400 w-24 text-right shrink-0">{a.state}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Storage logs</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                placeholder="Search logs…"
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 w-52"
              />
            </div>
            <button
              onClick={() =>
                downloadCsv(
                  "storage-logs",
                  [
                    { key: "timestamp", label: "Timestamp" },
                    { key: "collegeName", label: "College" },
                    { key: "tenantId", label: "Tenant ID" },
                    { key: "user", label: "User" },
                    { key: "fileName", label: "File" },
                    { key: "sizeMB", label: "Size (MB)" },
                    { key: "action", label: "Action" },
                    { key: "status", label: "Status" },
                    { key: "ip", label: "IP" },
                    { key: "responseMs", label: "Response (ms)" },
                  ],
                  filteredLogs.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })) as Record<string, unknown>[]
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">College</th>
                <th className="px-5 py-2.5 font-medium">User</th>
                <th className="px-5 py-2.5 font-medium">File</th>
                <th className="px-5 py-2.5 font-medium text-right">Size</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-2 text-xs text-gray-400 whitespace-nowrap">
                    {l.timestamp.toLocaleTimeString("en-IN")}
                  </td>
                  <td className="px-5 py-2 text-gray-700 whitespace-nowrap">{l.collegeName}</td>
                  <td className="px-5 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">{l.user}</td>
                  <td className="px-5 py-2 text-gray-700 font-mono text-xs whitespace-nowrap">{l.fileName}</td>
                  <td className="px-5 py-2 text-right tabular-nums text-gray-500">{l.sizeMB} MB</td>
                  <td className="px-5 py-2 text-gray-600">{l.action}</td>
                  <td className="px-5 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      l.status === "Success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-2 font-mono text-xs text-gray-400">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
