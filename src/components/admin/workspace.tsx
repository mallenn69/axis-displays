import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Plus, Save, Trash2, Inbox, FileText, Eye, EyeOff } from "lucide-react";
import { adminDb, type Lead } from "@/lib/admin";
import {
  adminCopy as copy,
  canEdit,
  draftSchema,
  draftTotal,
  emptyDraft,
  leadStatuses,
  money,
  type DraftInput,
  type QuoteDraft,
  type StaffRole,
} from "@/config/admin";
import { Logo } from "@/components/axis/logo";
import { GlassButton } from "@/components/axis/glass";

export function AdminWorkspace() {
  const [auth, setAuth] = useState<"loading" | "login" | "denied" | "ready" | "error">("loading");
  const [role, setRole] = useState<StaffRole>("viewer");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let generation = 0;
    const check = async (userId?: string) => {
      const version = ++generation;
      setAuth("loading");
      setError("");
      if (!userId) {
        setAuth("login");
        return;
      }
      try {
        const result = await adminDb
          .from("staff_members")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (version !== generation) return;
        if (result.error) {
          setAuth("error");
          return;
        }
        if (!result.data) {
          setAuth("denied");
          return;
        }
        setRole(result.data.role);
        setAuth("ready");
      } catch {
        if (version === generation) setAuth("error");
      }
    };
    // Defer DB work outside the auth callback so token refresh can finish.
    let timer: ReturnType<typeof setTimeout>;
    let currentUser: string | undefined;
    const {
      data: { subscription },
    } = adminDb.auth.onAuthStateChange((event, session) => {
      if (
        event === "TOKEN_REFRESHED" ||
        (event === "SIGNED_IN" && currentUser === session?.user.id)
      )
        return;
      currentUser = session?.user.id;
      clearTimeout(timer);
      timer = setTimeout(() => void check(session?.user.id), 0);
    });
    return () => {
      generation++;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);
  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await adminDb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(copy.loginError);
      else setPassword("");
    } catch {
      setError(copy.loginError);
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    setError("");
    try {
      const { error } = await adminDb.auth.signOut();
      if (error) throw error;
      setAuth("login");
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link to="/" aria-label="Axis home">
          <Logo />
        </Link>
        <span>{copy.title}</span>
        {auth !== "login" && auth !== "loading" && (
          <GlassButton onClick={logout} disabled={busy}>
            <LogOut size={15} />
            {copy.signOut}
          </GlassButton>
        )}
      </header>
      {auth === "ready" ? (
        <Workspace role={role} />
      ) : (
        <main className="admin-login glass-card">
          <span className="eyebrow eyebrow-accent">{copy.private}</span>
          <h1>{copy.loginTitle}</h1>
          {auth === "loading" ? (
            <p role="status">Checking access…</p>
          ) : auth === "login" ? (
            <>
              <p>{copy.loginText}</p>
              <form onSubmit={login} aria-busy={busy}>
                <label>
                  {copy.email}
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <div className="admin-password-control">
                <label htmlFor="admin-password">
                  {copy.password}
                </label>
                  <span className="admin-password-field">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="admin-password-toggle" aria-label={showPassword ? copy.hidePassword : copy.showPassword} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  </span>
                </div>
                <GlassButton primary type="submit" disabled={busy}>
                  {busy ? "Signing in…" : copy.signIn}
                </GlassButton>
              </form>
            </>
          ) : (
            <>
              <p role="alert">{auth === "denied" ? copy.denied : copy.unavailable}</p>
              {auth === "error" && (
                <GlassButton onClick={() => window.location.reload()}>Retry</GlassButton>
              )}
            </>
          )}
          <Link to="/" className="admin-back">
            <ArrowLeft size={14} />
            Back to website
          </Link>
        </main>
      )}
      {error && (
        <p className="admin-notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Workspace({ role }: { role: StaffRole }) {
  const [tab, setTab] = useState<"leads" | "quotes">("leads");
  const [leads, setLeads] = useState<Lead[]>([]),
    [drafts, setDrafts] = useState<QuoteDraft[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<{ input: DraftInput; saved?: QuoteDraft } | null>(null);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const [updating, setUpdating] = useState(false);
  const editable = canEdit(role);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [a, b] = await Promise.all([
        adminDb
          .from("quote_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        adminDb
          .from("quote_drafts")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(200),
      ]);
      if (a.error || b.error) throw new Error();
      setLeads(a.data ?? []);
      setDrafts(b.data ?? []);
    } catch {
      setError(copy.unavailable);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const changeStatus = async (lead: Lead, value: string) => {
    setUpdating(true);
    setError("");
    try {
      const { data, error } = await adminDb
        .from("quote_requests")
        .update({ status: value })
        .eq("id", lead.id)
        .select()
        .single();
      if (error) throw error;
      setSelected(data);
      setLeads((rows) => rows.map((row) => (row.id === lead.id ? data : row)));
    } catch {
      setError("Unable to update this lead. Please try again.");
    } finally {
      setUpdating(false);
    }
  };
  const startQuote = (lead?: Lead) => {
    const input = emptyDraft();
    if (lead)
      Object.assign(input, {
        title: `${lead.church_name} LED wall`,
        customer_name: lead.church_name,
        customer_email: lead.email,
        quote_request_id: lead.id,
      });
    setEditing({ input });
  };
  const shownLeads = leads.filter(
    (l) =>
      (status === "all" || l.status === status) &&
      `${l.church_name} ${l.name} ${l.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const shownDrafts = drafts.filter((d) =>
    `${d.title} ${d.customer_name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="admin-main">
      <div className="admin-title">
        <div>
          <span className="eyebrow eyebrow-accent">{role} access</span>
          <h1>
            From first hello
            <br />
            to Sunday morning.
          </h1>
        </div>
        {editable && !editing && (
          <GlassButton primary onClick={() => startQuote()}>
            <Plus size={16} />
            {copy.newQuote}
          </GlassButton>
        )}
      </div>
      <div className="admin-stats">
        <div>
          <span>New inquiries</span>
          <strong>{leads.filter((l) => l.status === "new").length}</strong>
        </div>
        <div>
          <span>Qualified leads</span>
          <strong>{leads.filter((l) => l.status === "qualified").length}</strong>
        </div>
        <div>
          <span>Quote drafts</span>
          <strong>{drafts.length}</strong>
        </div>
      </div>
      {editing ? (
        <QuoteEditor
          key={editing.saved?.id ?? "new"}
          initial={editing.input}
          saved={editing.saved}
          readOnly={!editable}
          onClose={() => setEditing(null)}
          onSaved={(draft) => {
            setDrafts((rows) => [draft, ...rows.filter((row) => row.id !== draft.id)]);
            setEditing({ input: draft, saved: draft });
          }}
        />
      ) : (
        <>
          <div className="admin-toolbar">
            <div className="admin-tabs">
              <button
                aria-pressed={tab === "leads"}
                onClick={() => {
                  setTab("leads");
                  setSelected(null);
                }}
              >
                <Inbox size={16} />
                {copy.inbox}
              </button>
              <button
                aria-pressed={tab === "quotes"}
                onClick={() => {
                  setTab("quotes");
                  setSelected(null);
                }}
              >
                <FileText size={16} />
                {copy.quotes}
              </button>
            </div>
            <label className="sr-only" htmlFor="admin-search">
              Search records
            </label>
            <input
              id="admin-search"
              placeholder="Search records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {tab === "leads" && (
              <select
                aria-label="Filter lead status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {leadStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
            <GlassButton onClick={load} disabled={loading}>
              Refresh
            </GlassButton>
          </div>
          {loading ? (
            <p role="status">Loading records…</p>
          ) : (
            <div className="admin-records glass-card">
              {tab === "leads"
                ? shownLeads.map((l) => (
                    <button className="admin-record" key={l.id} onClick={() => setSelected(l)}>
                      <span>
                        <strong>{l.church_name}</strong>
                        <small>
                          {l.name} · {l.city}, {l.state}
                        </small>
                      </span>
                      <span className="admin-status">{l.status}</span>
                      <time>{new Date(l.created_at).toLocaleDateString()}</time>
                    </button>
                  ))
                : shownDrafts.map((d) => (
                    <button
                      className="admin-record"
                      key={d.id}
                      onClick={() => setEditing({ input: d, saved: d })}
                    >
                      <span>
                        <strong>{d.title}</strong>
                        <small>{d.customer_name}</small>
                      </span>
                      <span>{money(draftTotal(d.line_items))}</span>
                      <span className="admin-status">Draft</span>
                    </button>
                  ))}
              {(tab === "leads" ? shownLeads.length : shownDrafts.length) === 0 && (
                <p className="admin-empty">
                  {search || status !== "all"
                    ? "No matching records."
                    : tab === "leads"
                      ? copy.emptyLeads
                      : copy.emptyQuotes}
                </p>
              )}
            </div>
          )}
          <p className="admin-caption">
            Showing up to 200 most recent records. Quote amounts are in USD.
          </p>
          {selected && (
            <section className="admin-detail glass-card">
              <div className="admin-title">
                <h2>{selected.church_name}</h2>
                <GlassButton onClick={() => setSelected(null)}>Close details</GlassButton>
              </div>
              <dl>
                <dt>Contact</dt>
                <dd>
                  {selected.name} · {selected.role}
                </dd>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </dd>
                <dt>Phone</dt>
                <dd>{selected.phone || "Not provided"}</dd>
                <dt>Timeline</dt>
                <dd>{selected.install_timeline || "Not provided"}</dd>
                <dt>Stage width</dt>
                <dd>{selected.stage_width ? `${selected.stage_width} ft` : "Not provided"}</dd>
                <dt>Message</dt>
                <dd>{selected.message || "No message"}</dd>
              </dl>
              <div className="admin-toolbar">
                <label>
                  Status
                  <select
                    disabled={!editable || updating}
                    value={selected.status}
                    onChange={(e) => changeStatus(selected, e.target.value)}
                  >
                    {leadStatuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                {editable && (
                  <GlassButton primary onClick={() => startQuote(selected)}>
                    {copy.newQuote}
                  </GlassButton>
                )}
              </div>
            </section>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="admin-notice">
          {error}
        </p>
      )}
    </main>
  );
}

function QuoteEditor({
  initial,
  saved,
  readOnly,
  onClose,
  onSaved,
}: {
  initial: DraftInput;
  saved?: QuoteDraft | undefined;
  readOnly: boolean;
  onClose: () => void;
  onSaved: (draft: QuoteDraft) => void;
}) {
  const [draft, setDraft] = useState<DraftInput>(() => structuredClone(initial));
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const patch = (input: Partial<DraftInput>) => {
    setDraft((d) => ({ ...d, ...input }));
    setDirty(true);
    setNotice("");
  };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = draftSchema.safeParse(draft);
    if (!parsed.success) {
      setNotice(
        "Complete the customer, title and line items. Use whole quantities and nonnegative prices.",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = saved
        ? await adminDb
            .from("quote_drafts")
            .update(parsed.data)
            .eq("id", saved.id)
            .eq("updated_at", saved.updated_at)
            .select()
            .maybeSingle()
        : await adminDb.from("quote_drafts").insert(parsed.data).select().single();
      if (result.error) throw result.error;
      if (!result.data) {
        setNotice(copy.conflict);
        return;
      }
      setDirty(false);
      onSaved(result.data);
      setNotice(copy.saved);
    } catch {
      setNotice("Unable to save the draft. Your changes are still here. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="admin-editor glass-card" onSubmit={save}>
      <div className="admin-title">
        <div>
          <span className="eyebrow eyebrow-accent">Quote draft</span>
          <h2>{saved ? saved.title : "Build a quote."}</h2>
        </div>
        <GlassButton
          type="button"
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm("Discard unsaved changes?")) onClose();
          }}
        >
          <ArrowLeft size={14} />
          Back
        </GlassButton>
      </div>
      <p>{copy.draftNotice}</p>
      <fieldset disabled={readOnly || busy}>
        <div className="admin-fields">
          <label>
            Quote title
            <input
              required
              maxLength={150}
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label>
            Customer / church
            <input
              required
              maxLength={150}
              value={draft.customer_name}
              onChange={(e) => patch({ customer_name: e.target.value })}
            />
          </label>
          <label>
            Customer email
            <input
              type="email"
              maxLength={255}
              value={draft.customer_email}
              onChange={(e) => patch({ customer_email: e.target.value })}
            />
          </label>
        </div>
        <div className="admin-lines">
          {draft.line_items.map((line, i) => (
            <div key={i} className="admin-line">
              <label>
                Description
                <input
                  required
                  maxLength={250}
                  value={line.description}
                  onChange={(e) =>
                    patch({
                      line_items: draft.line_items.map((l, n) =>
                        n === i ? { ...l, description: e.target.value } : l,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  required
                  value={line.quantity}
                  onChange={(e) =>
                    patch({
                      line_items: draft.line_items.map((l, n) =>
                        n === i ? { ...l, quantity: Number(e.target.value) } : l,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Unit price ($)
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step="0.01"
                  required
                  value={line.unit_price_cents / 100}
                  onChange={(e) =>
                    patch({
                      line_items: draft.line_items.map((l, n) =>
                        n === i
                          ? { ...l, unit_price_cents: Math.round(Number(e.target.value) * 100) }
                          : l,
                      ),
                    })
                  }
                />
              </label>
              <strong>{money(line.quantity * line.unit_price_cents)}</strong>
              <button
                type="button"
                aria-label={`Remove line ${i + 1}`}
                disabled={draft.line_items.length === 1}
                onClick={() => patch({ line_items: draft.line_items.filter((_, n) => n !== i) })}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <GlassButton
          type="button"
          disabled={draft.line_items.length >= 50}
          onClick={() =>
            patch({
              line_items: [
                ...draft.line_items,
                { description: "", quantity: 1, unit_price_cents: 0 },
              ],
            })
          }
        >
          <Plus size={16} />
          Add line item
        </GlassButton>
        <label className="admin-notes">
          Internal notes
          <textarea
            rows={4}
            maxLength={5000}
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </label>
      </fieldset>
      <div className="admin-total">
        <span>
          Draft total <small>Taxes and shipping only included if added as line items.</small>
        </span>
        <strong>{money(draftTotal(draft.line_items))}</strong>
      </div>
      {!readOnly && (
        <GlassButton primary type="submit" disabled={busy}>
          <Save size={16} />
          {busy ? "Saving…" : copy.save}
        </GlassButton>
      )}
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
