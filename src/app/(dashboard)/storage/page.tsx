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
import { DemoBadge } from "@/components/DemoBadge";
import {
  CATEGORICAL,
  CHART,
  axisTick,
  legendStyle,
  tooltipProps,
} from "@/lib/chart";

const PRIMARY = CHART.series[0];
const PRIMARY_LIGHT = CHART.series[1];
const WRITE = CHART.series[2];

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
    { name: "Unallocated", value: Math.max(0, platform.capacityGB - platform.allocatedGB), fill: CHART.neutral },
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
    toast.success(
      `${name} storage increased to ${current + 50} GB (demo — saved in this browser only)`
    );
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Infrastructure</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Storage Monitoring</h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform storage across all tenants — no storage backend exists yet,
            so these figures are simulated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            title="A simulated feed, not real telemetry — values are re-sampled on each tick."
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <span className={`w-2 h-2 rounded-full ${paused ? "bg-muted-foreground" : "bg-success animate-pulse"}`} />
            {paused ? "Paused" : "Simulated feed"}
          </span>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {INTERVALS.map((i) => (
              <button
                key={i.ms}
                onClick={() => setIntervalMs(i.ms)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  intervalMs === i.ms ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent/50"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overview.map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <c.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      {/* live throughput + live tiles */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Throughput (simulated)
            </h3>
            <span className="text-xs text-muted-foreground">read vs write · MB/s</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gWrite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={WRITE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={WRITE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick()} axisLine={false} tickLine={false} />
              <Tooltip isAnimationActive={false} {...tooltipProps} />
              <Legend wrapperStyle={legendStyle} />
              <Area type="monotone" dataKey="read" stroke={PRIMARY} strokeWidth={2} fill="url(#gRead)" isAnimationActive={false} name="Read" />
              <Area type="monotone" dataKey="write" stroke={WRITE} strokeWidth={2} fill="url(#gWrite)" isAnimationActive={false} name="Write" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Live metrics</h3>
            <DemoBadge
              label="Simulated"
              detail="These counters are re-sampled from fixed baselines on every tick. They are not real telemetry."
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {liveTiles.map((t) => (
              <div key={t.label}>
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* usage over time + capacity donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Storage usage over time (30d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={usage} margin={{ left: -12, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="day" tick={axisTick(10)} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={axisTick()} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipProps} />
              <Area type="monotone" dataKey="used" stroke={PRIMARY} strokeWidth={2} fill="url(#gUsage)" name="Used (GB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform capacity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={capacity} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2} stroke={CHART.slice} strokeWidth={2}>
                {capacity.map((c, i) => (
                  <Cell key={i} fill={c.fill} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
              <Legend iconType="circle" wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* top colleges + file types */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top colleges by storage</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, top.length * 34)}>
            <BarChart data={top} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tick={axisTick()} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisTick()} axisLine={false} tickLine={false} width={110} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="used" fill={PRIMARY} radius={4} name="Used (GB)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">File type distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={fileTypes} dataKey="gb" nameKey="type" outerRadius={82} stroke={CHART.slice} strokeWidth={2}>
                {fileTypes.map((_, i) => (
                  <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
              <Legend iconType="circle" wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* allocation vs usage */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Allocation vs usage by college</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, alloc.length * 40)}>
          <BarChart data={alloc} layout="vertical" margin={{ left: 20, right: 16 }} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" tick={axisTick()} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={axisTick()} axisLine={false} tickLine={false} width={110} />
            <Tooltip {...tooltipProps} />
            <Legend wrapperStyle={legendStyle} />
            <Bar dataKey="used" stackId="a" fill={PRIMARY} name="Used (GB)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="free" stackId="a" fill={CHART.neutral} name="Free (GB)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* per-college table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">College storage</h3>
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="px-5 py-2.5 font-medium">College</th>
                <th className="px-5 py-2.5 font-medium">Tenant</th>
                <th className="px-5 py-2.5 font-medium">Usage</th>
                <th className="px-5 py-2.5 font-medium text-right">Files</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const meta = STORAGE_STATUS_META[r.status];
                return (
                  <tr key={r.collegeId} className="hover:bg-accent/50">
                    <td className="px-5 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{r.tenantId}</td>
                    <td className="px-5 py-3 w-64">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${r.usagePct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-24 shrink-0">
                          {r.usedGB}/{r.allocatedGB} GB
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
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
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-strong" />
          <h3 className="text-sm font-semibold text-foreground">Storage alerts</h3>
          <span className="text-xs text-muted-foreground">({alerts.length})</span>
        </div>
        {alerts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No active alerts</div>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((a) => {
              const meta = ALERT_SEVERITY_META[a.severity];
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.collegeName} · {a.time.toLocaleString("en-IN")}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground w-24 text-right shrink-0">{a.state}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* logs */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Storage logs</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                placeholder="Search logs…"
                className="pl-8 pr-3 py-1.5 border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 w-52"
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
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
            <tbody className="divide-y divide-border">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-accent/50">
                  <td className="px-5 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {l.timestamp.toLocaleTimeString("en-IN")}
                  </td>
                  <td className="px-5 py-2 text-foreground whitespace-nowrap">{l.collegeName}</td>
                  <td className="px-5 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">{l.user}</td>
                  <td className="px-5 py-2 text-foreground font-mono text-xs whitespace-nowrap">{l.fileName}</td>
                  <td className="px-5 py-2 text-right tabular-nums text-muted-foreground">{l.sizeMB} MB</td>
                  <td className="px-5 py-2 text-muted-foreground">{l.action}</td>
                  <td className="px-5 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      l.status === "Success" ? "bg-success-subtle text-success" : "bg-destructive-subtle text-destructive"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-2 font-mono text-xs text-muted-foreground">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
