import { describe, expect, it } from "vitest";
import {
  getCollegeContact,
  getInvoices,
  getStorage,
  getSubscription,
  markInvoicePaid,
  PLANS,
  setCollegeContact,
  setStorageAllocation,
  setStorageConfig,
  setSubscriptionPricing,
  inr,
  type DemoCollege,
  type Subscription,
} from "@/lib/demo";

const college: DemoCollege = { id: 7, name: "Kongu Engineering College" };

const DATE_FIELDS = ["startDate", "endDate", "nextRenewal", "paymentDue"];

function withoutDates(sub: Subscription): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...sub };
  for (const field of DATE_FIELDS) delete copy[field];
  return copy;
}

describe("deterministic generation", () => {
  it("produces the same subscription for a college on every call", () => {
    const a = getSubscription(college);
    const b = getSubscription(college);
    // Dates are anchored to "now" by design, so they drift by the milliseconds
    // between the two calls; everything else must be identical.
    expect(withoutDates(a)).toEqual(withoutDates(b));
    expect(Math.abs(a.endDate.getTime() - b.endDate.getTime())).toBeLessThan(1000);
  });

  it("gives different colleges different figures", () => {
    const a = getSubscription({ id: 1, name: "A" });
    const b = getSubscription({ id: 2, name: "B" });
    expect(a.licensedUsers === b.licensedUsers && a.plan.id === b.plan.id).toBe(false);
  });

  it("derives status from days remaining", () => {
    // REMAIN_BUCKETS is indexed by college id, so these ids pin each branch.
    const statuses = [0, 1, 2, 3, 4, 5, 6].map((id) =>
      getSubscription({ id, name: `C${id}` })
    );
    for (const s of statuses) {
      if (s.daysRemaining < 0) expect(s.status).toBe("expired");
      else if (s.daysRemaining <= 10) expect(s.status).toBe("due");
      else if (s.daysRemaining <= 30) expect(s.status).toBe("expiring");
      else expect(s.status).toBe("active");
    }
    expect(new Set(statuses.map((s) => s.status)).size).toBeGreaterThan(1);
  });

  it("never reports more active users than licensed users", () => {
    for (let id = 0; id < 25; id++) {
      const s = getSubscription({ id, name: `C${id}` });
      expect(s.activeUsers).toBeLessThanOrEqual(s.licensedUsers);
    }
  });
});

describe("subscription overrides", () => {
  it("applies price and licence count, and flows them into the total", () => {
    setSubscriptionPricing(college.id, { costPerUser: 50, licensedUsers: 200 });
    const s = getSubscription(college);
    expect(s.costPerUser).toBe(50);
    expect(s.licensedUsers).toBe(200);
    expect(s.totalAmount).toBe(10000);
  });

  it("applies the plan, cycle and auto-renew captured by the wizard", () => {
    setSubscriptionPricing(college.id, {
      planId: "enterprise",
      billingCycle: "Quarterly",
      autoRenew: false,
    });
    const s = getSubscription(college);
    expect(s.plan.id).toBe("enterprise");
    expect(s.billingCycle).toBe("Quarterly");
    expect(s.cycleMonths).toBe(3);
    expect(s.autoRenew).toBe(false);
  });

  it("ignores a plan id that no longer exists", () => {
    setSubscriptionPricing(college.id, { planId: "retired-plan" });
    expect(PLANS.map((p) => p.id)).toContain(getSubscription(college).plan.id);
  });
});

describe("storage", () => {
  it("honours an allocation change and recomputes the free figure", () => {
    setStorageAllocation(college.id, 400);
    const s = getStorage(college);
    expect(s.allocatedGB).toBe(400);
    expect(s.usedGB + s.remainingGB).toBeCloseTo(400, 1);
  });

  it("honours the upload limit and thresholds from the wizard", () => {
    setStorageConfig(college.id, {
      maxUploadMB: 25,
      warningPct: 60,
      criticalPct: 80,
    });
    const s = getStorage(college);
    expect(s.maxUploadMB).toBe(25);
    expect(s.warningPct).toBe(60);
    expect(s.criticalPct).toBe(80);
  });

  it("derives status from the configured thresholds, not fixed ones", () => {
    // College 7 sits at 67% usage: healthy against the 70/90 defaults, and
    // critical once the wizard tightens the marks to 40/60.
    expect(getStorage(college).usagePct).toBe(67);
    expect(getStorage(college).status).toBe("healthy");
    setStorageConfig(college.id, { warningPct: 40, criticalPct: 60 });
    expect(getStorage(college).status).toBe("critical");
  });
});

describe("invoices", () => {
  it("charges 18% GST on the discounted subtotal", () => {
    const [current] = getInvoices(college);
    const taxable = current.subtotal - current.discount;
    expect(current.gst).toBe(Math.round(taxable * 0.18));
    expect(current.finalAmount).toBe(taxable + current.gst);
  });

  it("issues unique numbers and puts the current invoice first", () => {
    const invoices = getInvoices(college);
    expect(invoices.length).toBeGreaterThan(1);
    expect(new Set(invoices.map((i) => i.number)).size).toBe(invoices.length);
    expect(invoices[0].invoiceDate.getTime()).toBeGreaterThan(
      invoices[1].invoiceDate.getTime()
    );
  });

  it("marks every historical invoice paid with a payment date", () => {
    for (const inv of getInvoices(college).slice(1)) {
      expect(inv.status).toBe("Paid");
      expect(inv.lastPaymentDate).not.toBeNull();
    }
  });

  it("persists a mark-paid override across reads", () => {
    // College 6 lands in the expired bucket, so its current invoice is Overdue.
    const overdue: DemoCollege = { id: 6, name: "Lapsed College" };
    const before = getInvoices(overdue)[0];
    expect(before.status).toBe("Overdue");
    markInvoicePaid(before.number);
    const after = getInvoices(overdue)[0];
    expect(after.status).toBe("Paid");
    expect(after.lastPaymentDate).not.toBeNull();
  });

  it("bills the overridden price, since invoices derive from the subscription", () => {
    setSubscriptionPricing(college.id, { costPerUser: 100, licensedUsers: 10 });
    expect(getInvoices(college)[0].subtotal).toBe(1000);
  });
});

describe("college contact", () => {
  it("stores and reads back what the wizard captured", () => {
    setCollegeContact(college.id, {
      contactPerson: "Placement Head",
      phone: "+91 99999 00000",
      address: "Erode, TN",
    });
    expect(getCollegeContact(college.id)).toEqual({
      contactPerson: "Placement Head",
      phone: "+91 99999 00000",
      address: "Erode, TN",
    });
  });

  it("treats an all-blank contact block as absent", () => {
    setCollegeContact(college.id, { contactPerson: "  ", phone: "", address: undefined });
    expect(getCollegeContact(college.id)).toBeUndefined();
  });
});

describe("inr", () => {
  it("formats in the Indian grouping with a rupee sign", () => {
    expect(inr(1234567)).toBe("₹12,34,567");
    expect(inr(0)).toBe("₹0");
  });
});
