import { z } from "zod";
export const adminCopy = {
  title: "Axis workspace",
  loginTitle: "Admin sign in.",
  loginText: "Sign in to manage leads and prepare quotes.",
  private: "Private access · Axis Displays",
  email: "Email address",
  password: "Password",
  signIn: "Sign in",
  loginLink: "Admin login",
  showPassword: "Show password",
  hidePassword: "Hide password",
  signOut: "Sign out",
  denied: "Your account does not have workspace access. Ask the account owner to add you.",
  unavailable: "Unable to load the workspace. Please try again.",
  loginError: "Unable to sign in. Check your email and password.",
  inbox: "Lead inbox",
  quotes: "Quote drafts",
  newQuote: "New quote",
  emptyLeads: "New website inquiries will appear here.",
  emptyQuotes: "Create your first quote draft.",
  save: "Save draft",
  saved: "Draft saved.",
  draftNotice: "Internal draft. Saving does not send anything to the customer.",
  conflict: "This draft changed since you opened it. Reload it before saving again.",
};
export const leadStatuses = ["new", "contacted", "qualified", "closed"] as const;
export const staffRoles = ["owner", "admin", "sales", "viewer"] as const;
export type StaffRole = (typeof staffRoles)[number];
export const canEdit = (role: StaffRole) => role !== "viewer";
export const lineSchema = z.object({
  description: z.string().trim().min(1).max(250),
  quantity: z.number().int().min(1).max(10000),
  unit_price_cents: z.number().int().min(0).max(100000000),
});
export const draftSchema = z.object({
  title: z.string().trim().min(1).max(150),
  customer_name: z.string().trim().min(1).max(150),
  customer_email: z.union([z.literal(""), z.string().email().max(255)]),
  quote_request_id: z.string().uuid().nullable(),
  notes: z.string().max(5000),
  line_items: z.array(lineSchema).min(1).max(50),
});
export type DraftInput = z.infer<typeof draftSchema>;
export type QuoteDraft = DraftInput & {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
};
export const draftTotal = (lines: DraftInput["line_items"]) =>
  lines.reduce((sum, line) => sum + line.quantity * line.unit_price_cents, 0);
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
export const emptyDraft = (): DraftInput => ({
  title: "",
  customer_name: "",
  customer_email: "",
  quote_request_id: null,
  notes: "",
  line_items: [{ description: "", quantity: 1, unit_price_cents: 0 }],
});
