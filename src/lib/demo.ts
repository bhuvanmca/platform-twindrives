// ---------------------------------------------------------------------------
// Demo data layer
//
// The platform's billing, subscription and storage subsystems have no backend
// yet, so this module fabricates realistic, *deterministic* per-tenant data
// seeded from the college id. Every college always produces the same plan,
// invoices, storage figures, etc. — so the demo is stable across reloads and
// looks like a real multi-tenant SaaS.
//
// Mutations (mark-paid, allocate storage…) are persisted to localStorage so the
// demo "remembers" actions within a browser. Each accessor merges those
// overrides on top of the generated baseline.
//
// Everything here is intentionally isolated behind small functions so a later
// migration to live /platform/* endpoints is a per-function swap, not a rewrite.
// ---------------------------------------------------------------------------

export interface DemoCollege {
  id: number;
  name: string;
  created_at?: string;
}

// ---- deterministic RNG -----------------------------------------------------

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A per-college RNG. `salt` lets one college drive several independent streams.
function rngFor(id: number, salt = 0) {
  return mulberry32((id + 1) * 2654435761 + salt * 40503);
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}
function between(r: () => number, min: number, max: number) {
  return Math.round(min + r() * (max - min));
}

// ---- formatting ------------------------------------------------------------

export function inr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function addMonths(d: Date, m: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// ---- plans -----------------------------------------------------------------

export interface Plan {
  id: string;
  name: string;
  costPerUser: number; // per billing cycle, per licensed user
  maxUsers: number;
  blurb: string;
}

export const PLANS: Plan[] = [
  { id: "starter", name: "Starter", costPerUser: 40, maxUsers: 500, blurb: "Small colleges getting started" },
  { id: "growth", name: "Growth", costPerUser: 35, maxUsers: 2000, blurb: "Growing placement programs" },
  { id: "enterprise", name: "Enterprise", costPerUser: 30, maxUsers: 10000, blurb: "Large multi-campus institutions" },
];

// ---- subscription ----------------------------------------------------------

export type SubStatus = "active" | "expiring" | "due" | "expired";

export interface Subscription {
  collegeId: number;
  plan: Plan;
  billingCycle: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly";
  cycleMonths: number;
  licensedUsers: number;
  activeUsers: number;
  costPerUser: number;
  startDate: Date;
  endDate: Date;
  nextRenewal: Date;
  paymentDue: Date;
  autoRenew: boolean;
  totalAmount: number; // licensedUsers × costPerUser
  daysRemaining: number;
  status: SubStatus;
}

const CYCLES: { name: Subscription["billingCycle"]; months: number }[] = [
  { name: "Monthly", months: 1 },
  { name: "Quarterly", months: 3 },
  { name: "Half-Yearly", months: 6 },
  { name: "Yearly", months: 12 },
];

// Spread colleges across a few "days remaining" buckets so the demo shows every
// status colour without being random on each load.
const REMAIN_BUCKETS = [120, 64, 41, 22, 9, 4, -6];

export function getSubscription(c: DemoCollege): Subscription {
  const r = rngFor(c.id, 1);
  const plan = PLANS[c.id % PLANS.length];
  const cycle = pick(r, CYCLES);
  const ovr = subscriptionOverride(c.id);
  const licensedUsers =
    ovr?.licensedUsers ?? Math.max(25, between(r, 40, Math.min(plan.maxUsers, 1800)));
  const costPerUser = ovr?.costPerUser ?? plan.costPerUser;
  const activeUsers = Math.min(
    licensedUsers,
    Math.round(licensedUsers * (0.55 + r() * 0.4))
  );
  const daysRemaining = REMAIN_BUCKETS[c.id % REMAIN_BUCKETS.length];

  const now = new Date();
  const endDate = addDays(now, daysRemaining);
  const startDate = addMonths(endDate, -cycle.months);
  const nextRenewal = endDate;
  const paymentDue = addDays(endDate, -7);

  const status: SubStatus =
    daysRemaining < 0 ? "expired" : daysRemaining <= 10 ? "due" : daysRemaining <= 30 ? "expiring" : "active";

  return {
    collegeId: c.id,
    plan,
    billingCycle: cycle.name,
    cycleMonths: cycle.months,
    licensedUsers,
    activeUsers,
    costPerUser,
    startDate,
    endDate,
    nextRenewal,
    paymentDue,
    autoRenew: r() > 0.35,
    totalAmount: licensedUsers * costPerUser,
    daysRemaining,
    status,
  };
}

export const SUB_STATUS_META: Record<SubStatus, { label: string; dot: string; badge: string }> = {
  active: { label: "Active", dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
  expiring: { label: "Expiring soon", dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
  due: { label: "Due soon", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  expired: { label: "Expired", dot: "bg-red-500", badge: "bg-red-100 text-red-700" },
};

// ---- invoices --------------------------------------------------------------

export type InvoiceStatus = "Paid" | "Pending" | "Due Soon" | "Overdue" | "Cancelled";

export interface Invoice {
  number: string;
  collegeId: number;
  collegeName: string;
  planName: string;
  licensedUsers: number;
  costPerUser: number;
  subtotal: number;
  gst: number; // amount, 18%
  discount: number; // amount
  finalAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  lastPaymentDate: Date | null;
  nextRenewal: Date;
  paymentMethod: string;
  status: InvoiceStatus;
}

const GST_RATE = 0.18;
const METHODS = ["UPI", "Net Banking", "Credit Card", "NEFT", "Cheque"];

function computeAmounts(sub: Subscription, discountPct: number) {
  const subtotal = sub.totalAmount;
  const discount = Math.round(subtotal * discountPct);
  const gst = Math.round((subtotal - discount) * GST_RATE);
  const finalAmount = subtotal - discount + gst;
  return { subtotal, discount, gst, finalAmount };
}

// The current invoice status follows the subscription: an expired/near-due sub
// has an unpaid current invoice; healthy subs are paid up.
function currentStatusFor(sub: Subscription): InvoiceStatus {
  if (sub.status === "expired") return "Overdue";
  if (sub.status === "due") return "Due Soon";
  if (sub.status === "expiring") return "Pending";
  return "Paid";
}

export function getInvoices(c: DemoCollege): Invoice[] {
  const sub = getSubscription(c);
  const r = rngFor(c.id, 2);
  const discountPct = pick(r, [0, 0, 0.05, 0.1]);
  const amounts = computeAmounts(sub, discountPct);
  const method = pick(r, METHODS);

  const HISTORY = between(r, 2, 5); // number of past (paid) invoices
  const invoices: Invoice[] = [];

  // current invoice
  const curDate = addDays(sub.endDate, -sub.cycleMonths * 30);
  const curStatus = currentStatusFor(sub);
  invoices.push({
    number: invoiceNo(c.id, 0),
    collegeId: c.id,
    collegeName: c.name,
    planName: sub.plan.name,
    licensedUsers: sub.licensedUsers,
    costPerUser: sub.costPerUser,
    ...amounts,
    invoiceDate: curDate,
    dueDate: sub.paymentDue,
    lastPaymentDate: curStatus === "Paid" ? addDays(curDate, between(r, 1, 6)) : null,
    nextRenewal: sub.nextRenewal,
    paymentMethod: method,
    status: curStatus,
  });

  // past invoices, all paid, walking backwards one cycle at a time
  for (let i = 1; i <= HISTORY; i++) {
    const d = addMonths(curDate, -sub.cycleMonths * i);
    invoices.push({
      number: invoiceNo(c.id, i),
      collegeId: c.id,
      collegeName: c.name,
      planName: sub.plan.name,
      licensedUsers: sub.licensedUsers,
      costPerUser: sub.costPerUser,
      ...amounts,
      invoiceDate: d,
      dueDate: addDays(d, 7),
      lastPaymentDate: addDays(d, between(rngFor(c.id, 10 + i), 1, 6)),
      nextRenewal: addMonths(d, sub.cycleMonths),
      paymentMethod: method,
      status: "Paid",
    });
  }

  return applyInvoiceOverrides(invoices);
}

function invoiceNo(collegeId: number, seq: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(collegeId).padStart(3, "0")}${String(90 - seq).padStart(2, "0")}`;
}

export const INVOICE_STATUS_META: Record<InvoiceStatus, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-blue-100 text-blue-700",
  "Due Soon": "bg-orange-100 text-orange-700",
  Overdue: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

// ---- storage ---------------------------------------------------------------

export type StorageStatus = "healthy" | "warning" | "critical" | "full";

export interface StorageInfo {
  collegeId: number;
  allocatedGB: number;
  usedGB: number;
  remainingGB: number;
  usagePct: number;
  maxUploadMB: number;
  warningPct: number;
  criticalPct: number;
  fileCount: number;
  backupGB: number;
  lastUpload: Date;
  lastBackup: Date;
  status: StorageStatus;
}

const ALLOC_OPTIONS = [50, 100, 200, 500];

export function getStorage(c: DemoCollege): StorageInfo {
  const r = rngFor(c.id, 3);
  const base = pick(r, ALLOC_OPTIONS);
  const allocatedGB = storageOverride(c.id) ?? base;
  // usage percentage spread to show every health colour
  const pctBuckets = [22, 41, 58, 73, 88, 96, 34, 67];
  const usagePct = pctBuckets[c.id % pctBuckets.length];
  const usedGB = Math.round(allocatedGB * usagePct) / 100;
  const remainingGB = Math.round((allocatedGB - usedGB) * 100) / 100;
  const warningPct = 70;
  const criticalPct = 90;
  const status: StorageStatus =
    usagePct >= 100 ? "full" : usagePct >= criticalPct ? "critical" : usagePct >= warningPct ? "warning" : "healthy";

  const now = new Date();
  return {
    collegeId: c.id,
    allocatedGB,
    usedGB,
    remainingGB,
    usagePct,
    maxUploadMB: pick(r, [50, 100, 200]),
    warningPct,
    criticalPct,
    fileCount: between(r, 800, 42000),
    backupGB: Math.round(usedGB * 0.6 * 100) / 100,
    lastUpload: addDays(now, -between(r, 0, 2)),
    lastBackup: addDays(now, -between(r, 0, 3)),
    status,
  };
}

export const STORAGE_STATUS_META: Record<StorageStatus, { label: string; dot: string; badge: string; bar: string }> = {
  healthy: { label: "Healthy", dot: "bg-green-500", badge: "bg-green-100 text-green-700", bar: "bg-green-500" },
  warning: { label: "Warning", dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-500" },
  critical: { label: "Critical", dot: "bg-red-500", badge: "bg-red-100 text-red-700", bar: "bg-red-500" },
  full: { label: "Full", dot: "bg-gray-800", badge: "bg-gray-800 text-white", bar: "bg-gray-800" },
};

// ---- localStorage overrides ------------------------------------------------

interface Overrides {
  invoices?: Record<string, { status?: InvoiceStatus; lastPaymentDate?: string }>;
  storage?: Record<number, number>; // collegeId → allocatedGB
  subscription?: Record<number, { costPerUser?: number; licensedUsers?: number }>;
}

const KEY = "twindrives_demo_overrides";

function readOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function writeOverrides(o: Overrides) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(o));
}

function applyInvoiceOverrides(list: Invoice[]): Invoice[] {
  const ov = readOverrides().invoices || {};
  return list.map((inv) => {
    const o = ov[inv.number];
    if (!o) return inv;
    return {
      ...inv,
      status: o.status ?? inv.status,
      lastPaymentDate: o.lastPaymentDate ? new Date(o.lastPaymentDate) : inv.lastPaymentDate,
    };
  });
}

export function markInvoicePaid(number: string) {
  const ov = readOverrides();
  ov.invoices = ov.invoices || {};
  ov.invoices[number] = { status: "Paid", lastPaymentDate: new Date().toISOString() };
  writeOverrides(ov);
}

export function setInvoiceStatus(number: string, status: InvoiceStatus) {
  const ov = readOverrides();
  ov.invoices = ov.invoices || {};
  ov.invoices[number] = { ...ov.invoices[number], status };
  writeOverrides(ov);
}

function storageOverride(collegeId: number): number | undefined {
  return readOverrides().storage?.[collegeId];
}

export function setStorageAllocation(collegeId: number, gb: number) {
  const ov = readOverrides();
  ov.storage = ov.storage || {};
  ov.storage[collegeId] = gb;
  writeOverrides(ov);
}

function subscriptionOverride(
  collegeId: number
): { costPerUser?: number; licensedUsers?: number } | undefined {
  return readOverrides().subscription?.[collegeId];
}

// Set per-college pricing. Flows into the subscription widget and every invoice
// (invoices are derived from the subscription), so billing totals update too.
export function setSubscriptionPricing(
  collegeId: number,
  patch: { costPerUser?: number; licensedUsers?: number }
) {
  const ov = readOverrides();
  ov.subscription = ov.subscription || {};
  ov.subscription[collegeId] = { ...ov.subscription[collegeId], ...patch };
  writeOverrides(ov);
}

// ---------------------------------------------------------------------------
// Storage monitoring (Grafana/Prometheus-style)
// ---------------------------------------------------------------------------

export interface PlatformStorage {
  capacityGB: number;
  allocatedGB: number;
  usedGB: number;
  freeGB: number;
  colleges: number;
  files: number;
  activeUploads: number;
  growthTodayGB: number;
  growthMonthGB: number;
}

export function getPlatformStorage(colleges: DemoCollege[]): PlatformStorage {
  const per = colleges.map(getStorage);
  const allocatedGB = per.reduce((s, x) => s + x.allocatedGB, 0);
  const usedGB = Math.round(per.reduce((s, x) => s + x.usedGB, 0) * 100) / 100;
  const files = per.reduce((s, x) => s + x.fileCount, 0);
  const capacityGB = Math.max(2000, Math.ceil((allocatedGB * 1.4) / 500) * 500);
  return {
    capacityGB,
    allocatedGB,
    usedGB,
    freeGB: Math.round((capacityGB - usedGB) * 100) / 100,
    colleges: colleges.length,
    files,
    activeUploads: 3 + (files % 11),
    growthTodayGB: Math.round(usedGB * 0.012 * 100) / 100,
    growthMonthGB: Math.round(usedGB * 0.18 * 100) / 100,
  };
}

// Deterministic per-college usage figures for tables/charts.
export interface CollegeStorageRow extends StorageInfo {
  name: string;
  tenantId: string;
}

export function getStorageRows(colleges: DemoCollege[]): CollegeStorageRow[] {
  return colleges.map((c) => ({
    ...getStorage(c),
    name: c.name,
    tenantId: `T-${String(c.id).padStart(4, "0")}`,
  }));
}

// Usage-over-time trend (last N days), climbing to the current platform total.
export function storageUsageSeries(colleges: DemoCollege[], days = 30) {
  const total = getPlatformStorage(colleges).usedGB;
  const out: { day: string; used: number; allocated: number }[] = [];
  const alloc = getPlatformStorage(colleges).allocatedGB;
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    // gentle S-curve growth to `total`
    const t = (days - 1 - i) / (days - 1);
    const factor = 0.72 + 0.28 * t;
    const wobble = 1 + (mulberry32(i * 7919)() - 0.5) * 0.03;
    out.push({
      day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      used: Math.round(total * factor * wobble * 100) / 100,
      allocated: alloc,
    });
  }
  return out;
}

export function fileTypeDistribution(colleges: DemoCollege[]) {
  const total = getPlatformStorage(colleges).usedGB;
  const split = [
    { type: "Documents", pct: 0.34 },
    { type: "Images", pct: 0.26 },
    { type: "Video", pct: 0.19 },
    { type: "Archives", pct: 0.12 },
    { type: "Spreadsheets", pct: 0.06 },
    { type: "Other", pct: 0.03 },
  ];
  return split.map((s) => ({ type: s.type, gb: Math.round(total * s.pct * 100) / 100 }));
}

// ---- live metrics (intentionally non-deterministic — this is the live feed) --

export interface LiveMetrics {
  readMBps: number;
  writeMBps: number;
  uploadMBps: number;
  downloadMBps: number;
  activeUploads: number;
  activeDownloads: number;
  uploadSuccessRate: number;
  failedUploads: number;
  avgUploadMB: number;
  apiResponseMs: number;
  storageLatencyMs: number;
  activeConnections: number;
  iops: number;
  queueLength: number;
}

function jitter(base: number, spread: number, decimals = 0) {
  const v = base + (Math.random() - 0.5) * spread;
  const f = Math.pow(10, decimals);
  return Math.max(0, Math.round(v * f) / f);
}

export function sampleLiveMetrics(): LiveMetrics {
  return {
    readMBps: jitter(148, 60, 1),
    writeMBps: jitter(96, 44, 1),
    uploadMBps: jitter(38, 22, 1),
    downloadMBps: jitter(72, 34, 1),
    activeUploads: jitter(12, 10),
    activeDownloads: jitter(24, 16),
    uploadSuccessRate: jitter(99.2, 1.2, 1),
    failedUploads: jitter(2, 4),
    avgUploadMB: jitter(4.6, 3, 1),
    apiResponseMs: jitter(84, 50),
    storageLatencyMs: jitter(11, 8, 1),
    activeConnections: jitter(340, 120),
    iops: jitter(2400, 900),
    queueLength: jitter(3, 6),
  };
}

// ---- alerts ----------------------------------------------------------------

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertState = "Open" | "Acknowledged" | "Resolved";

export interface StorageAlert {
  id: string;
  time: Date;
  collegeName: string;
  severity: AlertSeverity;
  description: string;
  state: AlertState;
}

export function getStorageAlerts(colleges: DemoCollege[]): StorageAlert[] {
  const rows = getStorageRows(colleges);
  const alerts: StorageAlert[] = [];
  const now = new Date();
  rows.forEach((s, i) => {
    if (s.status === "critical" || s.status === "full") {
      alerts.push({
        id: `al-${s.collegeId}-c`,
        time: new Date(now.getTime() - (i + 1) * 37 * 60000),
        collegeName: s.name,
        severity: "critical",
        description: `Storage above 90% (${s.usagePct}% of ${s.allocatedGB} GB)`,
        state: "Open",
      });
    } else if (s.status === "warning") {
      alerts.push({
        id: `al-${s.collegeId}-w`,
        time: new Date(now.getTime() - (i + 1) * 53 * 60000),
        collegeName: s.name,
        severity: "warning",
        description: `Storage above 70% (${s.usagePct}% of ${s.allocatedGB} GB)`,
        state: i % 2 === 0 ? "Acknowledged" : "Open",
      });
    }
  });
  // a couple of operational alerts
  if (rows[0]) {
    alerts.push({
      id: "al-backup",
      time: new Date(now.getTime() - 128 * 60000),
      collegeName: rows[rows.length - 1]?.name ?? rows[0].name,
      severity: "warning",
      description: "Nightly backup completed with retries",
      state: "Resolved",
    });
  }
  return alerts.sort((a, b) => b.time.getTime() - a.time.getTime());
}

export const ALERT_SEVERITY_META: Record<AlertSeverity, { label: string; badge: string; dot: string }> = {
  info: { label: "Info", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  warning: { label: "Warning", badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  critical: { label: "Critical", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

// ---- logs ------------------------------------------------------------------

export interface StorageLog {
  id: string;
  timestamp: Date;
  collegeName: string;
  tenantId: string;
  user: string;
  fileName: string;
  sizeMB: number;
  action: "Upload" | "Download" | "Delete";
  status: "Success" | "Failed";
  ip: string;
  responseMs: number;
}

const FIRST_NAMES = ["arjun", "priya", "rahul", "sneha", "vikram", "divya", "karthik", "meena"];
const FILE_STEMS = ["resume", "transcript", "offer_letter", "id_proof", "photo", "marksheet", "report", "certificate"];
const EXTS = ["pdf", "png", "jpg", "docx", "xlsx", "zip"];
const ACTIONS: StorageLog["action"][] = ["Upload", "Upload", "Upload", "Download", "Download", "Delete"];

export function getStorageLogs(colleges: DemoCollege[], limit = 60): StorageLog[] {
  const rows = getStorageRows(colleges);
  if (rows.length === 0) return [];
  const logs: StorageLog[] = [];
  const now = new Date();
  for (let i = 0; i < limit; i++) {
    const r = mulberry32(i * 2246822519 + 7);
    const col = rows[Math.floor(r() * rows.length)];
    const action = pick(r, ACTIONS);
    const failed = r() > 0.94;
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(now.getTime() - i * between(r, 40, 220) * 1000),
      collegeName: col.name,
      tenantId: col.tenantId,
      user: `${pick(r, FIRST_NAMES)}@${col.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 8) || "college"}.edu`,
      fileName: `${pick(r, FILE_STEMS)}_${between(r, 100, 999)}.${pick(r, EXTS)}`,
      sizeMB: Math.round((0.2 + r() * 24) * 10) / 10,
      action,
      status: failed ? "Failed" : "Success",
      ip: `${between(r, 10, 210)}.${between(r, 0, 255)}.${between(r, 0, 255)}.${between(r, 1, 254)}`,
      responseMs: between(r, 40, 480),
    });
  }
  return logs;
}

// ---------------------------------------------------------------------------
// Notifications (in-app)
// ---------------------------------------------------------------------------

export type NotifSeverity = "info" | "success" | "warning" | "critical";

export interface Notification {
  id: string;
  severity: NotifSeverity;
  title: string;
  body: string;
  time: Date;
  read: boolean;
}

export function getNotifications(colleges: DemoCollege[]): Notification[] {
  const now = new Date();
  const list: Omit<Notification, "read">[] = [];
  colleges.forEach((c, i) => {
    const sub = getSubscription(c);
    const st = getStorage(c);
    if (sub.status === "expired") {
      list.push({ id: `n-${c.id}-sub`, severity: "critical", title: "Subscription expired", body: `${c.name}'s subscription lapsed ${Math.abs(sub.daysRemaining)} days ago.`, time: new Date(now.getTime() - i * 3.1e6) });
    } else if (sub.status === "due") {
      list.push({ id: `n-${c.id}-sub`, severity: "warning", title: "Payment due soon", body: `${c.name}'s invoice is due in ${sub.daysRemaining} days.`, time: new Date(now.getTime() - i * 4.2e6) });
    } else if (sub.status === "expiring") {
      list.push({ id: `n-${c.id}-sub`, severity: "info", title: "Subscription expiring", body: `${c.name}'s plan renews in ${sub.daysRemaining} days.`, time: new Date(now.getTime() - i * 5.3e6) });
    }
    if (st.status === "critical" || st.status === "full") {
      list.push({ id: `n-${c.id}-st`, severity: "critical", title: "Storage critical", body: `${c.name} is at ${st.usagePct}% of ${st.allocatedGB} GB.`, time: new Date(now.getTime() - i * 2.4e6) });
    } else if (st.status === "warning") {
      list.push({ id: `n-${c.id}-st`, severity: "warning", title: "Storage warning", body: `${c.name} crossed 70% storage (${st.usagePct}%).`, time: new Date(now.getTime() - i * 6.1e6) });
    }
  });
  const read = readNotifState();
  return list
    .map((n) => ({ ...n, read: read[n.id] === true }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());
}

const NOTIF_KEY = "twindrives_demo_notif_read";
function readNotifState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
  } catch {
    return {};
  }
}
export function markNotificationsRead(ids: string[]) {
  if (typeof window === "undefined") return;
  const state = readNotifState();
  ids.forEach((id) => (state[id] = true));
  localStorage.setItem(NOTIF_KEY, JSON.stringify(state));
}

export const NOTIF_SEVERITY_META: Record<NotifSeverity, { dot: string; ring: string }> = {
  info: { dot: "bg-blue-500", ring: "bg-blue-100 text-blue-600" },
  success: { dot: "bg-green-500", ring: "bg-green-100 text-green-600" },
  warning: { dot: "bg-yellow-500", ring: "bg-yellow-100 text-yellow-600" },
  critical: { dot: "bg-red-500", ring: "bg-red-100 text-red-600" },
};
