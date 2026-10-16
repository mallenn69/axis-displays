import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { QuoteWorkspace } from "@/components/quotes/quote-workspace";
import { emptyCatalog, newQuote } from "@/config/quote-workspace";
const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), book: vi.fn() }));
vi.mock("@/lib/package-quote-api", () => ({
  loadQuoteWorkspace: api.load,
  savePackageQuote: api.save,
  saveCostCatalog: api.book,
}));
afterEach(cleanup);
beforeEach(() => {
  const c = structuredClone(emptyCatalog);
  for (const k of Object.keys(c.prices) as (keyof typeof c.prices)[]) c.prices[k] = 100;
  c.dimensionsConfirmed = true;
  api.load.mockResolvedValue({ catalog: { id: true, data: c, revision: 1 }, quotes: [] });
  api.save.mockImplementation(async (q, prior) => ({
    id: prior?.id ?? "test-id",
    title: q.title,
    payload: q,
    revision: (prior?.revision ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }));
  api.save.mockClear();
});
it("saves private draft with exact manual supports and keeps export blocked until reviewed", async () => {
  render(<QuoteWorkspace demo={false} role="owner" leads={[]} />);
  await screen.findByText("No quotes yet. Set up your cost book, then build your first package.");
  fireEvent.click(screen.getByRole("button", { name: "New quote" }));
  fireEvent.change(screen.getByLabelText("Base plate + truss supports"), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(api.save).toHaveBeenCalledOnce());
  const payload = api.save.mock.calls[0]![0];
  expect(payload.supports).toBe(3);
  expect(payload.clampsPerSupport).toBe(3);
  expect(payload.catalog.prices.single).toBe(100);
  expect(screen.getByRole("button", { name: "Copy customer quote" })).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText("I reviewed all package costs, including any zero amounts"),
  );
  expect(screen.getByRole("button", { name: "Copy customer quote" })).toBeEnabled();
});
it("blocks viewer changes even when viewing a saved quote", async () => {
  const c = structuredClone(emptyCatalog);
  api.load.mockResolvedValue({
    catalog: { id: true, data: c, revision: 1 },
    quotes: [
      {
        id: "q",
        title: "Existing quote",
        payload: newQuote(c),
        revision: 4,
        updated_at: new Date().toISOString(),
      },
    ],
  });
  render(<QuoteWorkspace demo={false} role="viewer" leads={[]} />);
  fireEvent.click(await screen.findByRole("button", { name: /Existing quote/ }));
  expect(screen.getByLabelText("Panels wide")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "New quote" })).toBeDisabled();
});
