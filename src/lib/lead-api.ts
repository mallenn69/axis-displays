import { supabase } from "@/integrations/supabase/client";
export const leadService = import.meta.env["VITE_LEADS_ENDPOINT"] as string | undefined;
export const hasLeadService = Boolean(
  leadService &&
  import.meta.env["VITE_SUPABASE_URL"] &&
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
);
export async function leadApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!hasLeadService) throw new Error("The lead service is not connected yet.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");
  const response = await fetch(`${leadService!.replace(/\/$/, "")}/${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to complete the request.");
  return result as T;
}
export function exportLeads(rows: import("@/config/command").ChurchLead[]) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const keys = [
    "id",
    "name",
    "church_name",
    "email",
    "phone",
    "state",
    "status",
    "description",
    "created_at",
  ] as const;
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join(
    "\r\n",
  );
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "axis-leads.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
