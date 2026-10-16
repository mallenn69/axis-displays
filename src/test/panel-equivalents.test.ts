import { expect, it } from "vitest";
import { singlePanelCount, calculateQuote, customerQuote } from "@/lib/quote-calculator";
import { emptyCatalog, newQuote } from "@/config/quote-workspace";
it("shows 33 doubles as 66 single-panel equivalents without changing priced cabinet counts", () => {
  const catalog = structuredClone(emptyCatalog);
  for (const key of Object.keys(catalog.prices) as (keyof typeof catalog.prices)[])
    catalog.prices[key] = 100;
  catalog.dimensionsConfirmed = true;
  const q = newQuote(catalog);
  q.sections = [{ id: "a", name: "Main", type: "double", wide: 11, tall: 3, quantity: 1 }];
  q.supports = 3;
  q.costsReviewed = true;
  expect(singlePanelCount(q.sections[0])).toBe(66);
  expect(calculateQuote(q).doubles).toBe(33);
  expect(customerQuote(q)).toContain("66 panels total (single-panel equivalents)");
  expect(singlePanelCount({ ...q.sections[0], type: "single", quantity: 2 })).toBe(66);
});
