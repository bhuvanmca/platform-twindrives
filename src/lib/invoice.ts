import { inr, fmtDate, type Invoice } from "@/lib/demo";

// Opens a clean, print-ready invoice in a new window and triggers the browser's
// print dialog — from which the user can "Save as PDF". No PDF library needed,
// which keeps the bundle small; the browser does the rendering.
export function openInvoicePdf(inv: Invoice) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) {
    alert("Please allow pop-ups to download the invoice.");
    return;
  }

  const row = (label: string, value: string) =>
    `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;

  w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${inv.number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1f2430; margin: 0; padding: 48px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4338ca; padding-bottom: 20px; }
  .brand { font-size: 20px; font-weight: 700; color: #4338ca; }
  .brand small { display: block; font-size: 11px; font-weight: 500; color: #6b7280; letter-spacing: .08em; text-transform: uppercase; }
  .inv-meta { text-align: right; font-size: 13px; color: #6b7280; }
  .inv-meta b { color: #1f2430; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin: 32px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  .bill td { padding: 4px 0; font-size: 14px; }
  .bill .lbl { color: #6b7280; width: 45%; }
  .bill .val { text-align: right; font-weight: 500; }
  .lines { margin-top: 8px; font-size: 14px; }
  .lines th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #9ca3af; border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
  .lines td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
  .lines .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; width: 280px; margin-top: 16px; }
  .totals td { padding: 6px 0; font-size: 14px; }
  .totals .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals .grand td { border-top: 2px solid #1f2430; padding-top: 12px; font-size: 16px; font-weight: 700; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .paid { background: #dcfce7; color: #15803d; }
  .unpaid { background: #fef3c7; color: #b45309; }
  .foot { margin-top: 48px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
  .noprint { text-align: center; margin-top: 32px; }
  .btn { background: #4338ca; color: #fff; border: 0; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">TwinDrives<small>Placement Platform</small></div>
    <div class="inv-meta">
      <div>Invoice <b>${inv.number}</b></div>
      <div>Date: <b>${fmtDate(inv.invoiceDate)}</b></div>
      <div>Due: <b>${fmtDate(inv.dueDate)}</b></div>
      <div style="margin-top:8px"><span class="status ${inv.status === "Paid" ? "paid" : "unpaid"}">${inv.status}</span></div>
    </div>
  </div>

  <h2>Billed to</h2>
  <div style="font-size:15px;font-weight:600">${inv.collegeName}</div>
  <div style="font-size:13px;color:#6b7280">Subscription plan: ${inv.planName}</div>

  <h2>Details</h2>
  <table class="lines">
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>${inv.planName} plan — licensed users</td>
        <td class="num">${inv.licensedUsers}</td>
        <td class="num">${inr(inv.costPerUser)}</td>
        <td class="num">${inr(inv.subtotal)}</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td class="num">${inr(inv.subtotal)}</td></tr>
    ${inv.discount ? `<tr><td>Discount</td><td class="num">− ${inr(inv.discount)}</td></tr>` : ""}
    <tr><td>GST (18%)</td><td class="num">${inr(inv.gst)}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">${inr(inv.finalAmount)}</td></tr>
  </table>

  <h2>Payment</h2>
  <table class="bill">
    ${row("Method", inv.paymentMethod)}
    ${row("Last payment", inv.lastPaymentDate ? fmtDate(inv.lastPaymentDate) : "—")}
    ${row("Next renewal", fmtDate(inv.nextRenewal))}
  </table>

  <div class="foot">This is a system-generated invoice for demonstration purposes · TwinDrives · Twincord Technologies</div>

  <div class="noprint"><button class="btn" onclick="window.print()">Print / Save as PDF</button></div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`);
  w.document.close();
}
