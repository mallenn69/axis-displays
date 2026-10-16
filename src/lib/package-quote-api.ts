import { supabase } from "@/integrations/supabase/client";
import {
  catalogSchema,
  quoteSchema,
  type Catalog,
  type QuoteInput,
} from "@/config/quote-workspace";
export type SavedQuote = {
  id: string;
  title: string;
  payload: QuoteInput;
  revision: number;
  updated_at: string;
};
export type SavedCatalog = { id: boolean; data: Catalog; revision: number };
async function rest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");
  const response = await fetch(`${import.meta.env["VITE_SUPABASE_URL"]}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      detail.code === "PGRST205"
        ? "Quote storage is not installed yet. Ask your administrator to apply the quote workspace migration."
        : detail.message || "Unable to save quote.",
    );
  }
  return response.json();
}
export async function loadQuoteWorkspace() {
  const [catalog, quotes] = await Promise.all([
    rest<SavedCatalog[]>("axis_quote_catalog?select=*"),
    rest<SavedQuote[]>("axis_package_quotes?select=*&order=updated_at.desc&limit=200"),
  ]);
  return {
    catalog: catalog[0] ? { ...catalog[0], data: catalogSchema.parse(catalog[0].data) } : null,
    quotes: quotes.map((q) => ({ ...q, payload: quoteSchema.parse(q.payload) })),
  };
}
export async function savePackageQuote(q: QuoteInput, prior?: Pick<SavedQuote, "id" | "revision">) {
  const payload = quoteSchema.parse(q);
  const rows = await rest<SavedQuote[]>(
    prior
      ? `axis_package_quotes?id=eq.${prior.id}&revision=eq.${prior.revision}`
      : "axis_package_quotes",
    prior ? "PATCH" : "POST",
    { title: payload.title, payload },
  );
  if (!rows[0]) throw new Error("This quote changed in another session. Reload it before saving.");
  return rows[0];
}
export async function saveCostCatalog(c: Catalog, revision?: number) {
  const data = catalogSchema.parse(c);
  const rows = await rest<SavedCatalog[]>(
    revision ? `axis_quote_catalog?id=eq.true&revision=eq.${revision}` : "axis_quote_catalog",
    revision ? "PATCH" : "POST",
    { id: true, data },
  );
  if (!rows[0]) throw new Error("The cost book changed in another session. Reload before saving.");
  return rows[0];
}
