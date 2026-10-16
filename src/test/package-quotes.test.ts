import { describe, it, expect } from "vitest";
import { emptyCatalog, newQuote, catalogSchema } from "@/config/quote-workspace";
import {
  calculateQuote,
  customerQuote,
  fitGrid,
  scaledMargin,
  dimensions,
} from "@/lib/quote-calculator";
function quote() {
  const c = structuredClone(emptyCatalog);
  for (const k of Object.keys(c.prices) as (keyof typeof c.prices)[]) c.prices[k] = 100;
  c.dimensionsConfirmed = true;
  const q = newQuote(c);
  q.supports = 3;
  q.costsReviewed = true;
  return q;
}
describe("package quote math", () => {
  it("counts double panels, repeated columns, spare panels and rounded cases separately", () => {
    const q = quote();
    q.sections = [
      { id: "a", name: "Main", type: "double", wide: 12, tall: 3, quantity: 1 },
      { id: "b", name: "Columns", type: "single", wide: 1, tall: 5, quantity: 2 },
    ];
    q.spareDoubles = 1;
    const r = calculateQuote(q);
    expect(r.singles).toBe(10);
    expect(r.doubles).toBe(37);
    expect(r.lines.find((l) => l.label.includes("8 singles"))?.quantity).toBe(2);
    expect(r.lines.find((l) => l.label.includes("6 doubles"))?.quantity).toBe(7);
    expect(r.lines.find((l) => l.label.includes("clamp"))?.quantity).toBe(9);
    expect(r.lines.find((l) => l.label.includes("base plate"))?.quantity).toBe(3);
  });
  it("includes only the selected mounting system", () => {
    const q = quote();
    q.mount = "hung";
    q.bars = 12;
    q.slings = 4;
    const r = calculateQuote(q);
    expect(r.lines.some((l) => l.label.includes("base plate"))).toBe(false);
    expect(r.lines.find((l) => l.label === "Hanging bar")?.quantity).toBe(12);
  });
  it("uses gross margin not markup and keeps tax out of margin", () => {
    const q = quote();
    q.marginMode = "manual";
    q.manualMargin = 50;
    q.taxPercent = 10;
    const r = calculateQuote(q);
    expect(r.priceCents).toBe(r.costCents * 2);
    expect(r.profitCents).toBe(r.costCents);
    expect(r.totalCents).toBe(r.priceCents + r.taxCents);
  });
  it("includes shipping and labor in whole-package margin", () => {
    const q = quote();
    q.marginMode = "manual";
    q.manualMargin = 50;
    const first = calculateQuote(q);
    q.shipping = 1000;
    q.labor = 1500;
    const next = calculateQuote(q);
    expect(next.costCents - first.costCents).toBe(250000);
    expect(next.priceCents - first.priceCents).toBe(500000);
  });
  it("keeps scaled margin bounded and price increasing over thresholds", () => {
    let previous = 0;
    for (let cost = 100; cost <= 100000; cost += 100) {
      const margin = scaledMargin(cost, 5000, 50000);
      expect(margin).toBeGreaterThanOrEqual(50);
      expect(margin).toBeLessThanOrEqual(73);
      const price = cost / (1 - margin / 100);
      expect(price).toBeGreaterThan(previous);
      previous = price;
    }
    expect(scaledMargin(5000, 5000, 50000)).toBe(73);
    expect(scaledMargin(50000, 5000, 50000)).toBe(50);
    expect(
      catalogSchema.safeParse({ ...emptyCatalog, startCost: 5000, floorCost: 6000 }).success,
    ).toBe(false);
  });
  it("does not silently price missing costs as a complete quote", () => {
    const q = quote();
    q.catalog.prices.single = null;
    expect(calculateQuote(q).missing).toContain("Pro 2.6mm single panel");
    expect(() => customerQuote(q)).toThrow();
    q.catalog.prices.single = 0;
    expect(calculateQuote(q).missing).toHaveLength(0);
  });
  it("exports customer scope without internal costs, margins or notes", () => {
    const q = quote();
    q.notes = "PRIVATE PURCHASE SECRET";
    const copy = customerQuote(q);
    expect(copy).toContain("Package price");
    expect(copy).not.toMatch(/PRIVATE PURCHASE SECRET|Gross margin|Package cost/);
    q.costsReviewed = false;
    expect(() => customerQuote(q)).toThrow();
  });
  it("rejects invalid quantities and unsafe margin values", () => {
    for (const value of [-1, 1.5, NaN, Infinity]) {
      const q = quote();
      q.supports = value;
      expect(() => calculateQuote(q)).toThrow();
    }
    const q = quote();
    q.manualMargin = 49;
    expect(() => calculateQuote(q)).toThrow();
  });
  it("returns cabinet dimensions, not an invented exact target size", () => {
    const c = quote().catalog;
    const g = fitGrid(20, 11.25, "single", c);
    expect(g).toEqual({ wide: 12, tall: 7 });
    const d = dimensions({ id: "a", name: "A", type: "single", quantity: 1, ...g }, c);
    expect(d.widthFt).toBeCloseTo(19.685, 3);
    expect(d.heightFt).toBeCloseTo(11.483, 3);
    expect(() => fitGrid(0, 10, "single", c)).toThrow();
  });
});
