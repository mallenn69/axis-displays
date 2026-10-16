import { expect, it } from "vitest";
import { emptyCatalog, newQuote } from "@/config/quote-workspace";
import { quoteDocument } from "@/lib/quote-document";
it("escapes customer content and excludes internal notes and catalog from the customer document", () => {
  const catalog = structuredClone(emptyCatalog);
  for (const key of Object.keys(catalog.prices) as (keyof typeof catalog.prices)[])
    catalog.prices[key] = 100;
  catalog.dimensionsConfirmed = true;
  const q = newQuote(catalog);
  q.supports = 3;
  q.costsReviewed = true;
  q.customer = "<img src=x onerror=alert(1)>";
  q.internalNotes = "PRIVATE PURCHASE NEGOTIATION";
  const html = quoteDocument(q);
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).not.toContain(q.customer);
  expect(html).not.toContain(q.internalNotes);
  expect(html).not.toContain("manualMargin");
  expect(html).not.toContain("singleWidthMm");
  expect(html).toContain("Print / Save PDF");
  q.costsReviewed = false;
  expect(() => quoteDocument(q)).toThrow();
});
