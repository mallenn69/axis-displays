import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Inbox,
  Search,
  RefreshCw,
  Download,
  Link2,
  LogOut,
  X,
  Mail,
  Phone,
  MapPin,
  Image,
  Check,
  Zap,
  Circle,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import logo from "@/assets/axis-displays-logo.png";
import stage from "@/assets/axis-stage-wide.jpg";
import { supabase } from "@/integrations/supabase/client";
import { leadApi, hasLeadService, exportLeads } from "@/lib/lead-api";
import { commandCopy, demoLeads, pipeline, type ChurchLead, type Pipeline } from "@/config/command";
import "./command.css";
type Settings = { enabled: boolean; configured: boolean; destination: string | null; role: string };
export function CommandCenter() {
  const [mode, setMode] = useState<"loading" | "login" | "live" | "demo">(
    hasLeadService ? "loading" : "login",
  );
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!hasLeadService) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setMode(session ? "live" : "login");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await supabase.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
      setPassword("");
    } catch {
      setError("Unable to sign in. Check your email and password.");
    } finally {
      setBusy(false);
    }
  }
  if (mode === "loading") return <div className="cc-login">Checking your session…</div>;
  if (mode === "login")
    return (
      <div className="cc-login">
        <img src={logo} alt="Axis Displays" />
        <p className="cc-kicker">PRIVATE WORKSPACE</p>
        <h1>
          A clearer view
          <br />
          of what’s next.
        </h1>
        <p>Manage inquiries. Follow up. Move projects forward.</p>
        {hasLeadService ? (
          <form onSubmit={login}>
            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="cc-primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"} <ArrowUpRight size={17} />
            </button>
          </form>
        ) : (
          <p className="cc-notice">
            Live access is awaiting backend setup. You can explore the dashboard with clearly
            labeled sample leads below.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <button className="cc-outline" onClick={() => setMode("demo")}>
          Explore demo workspace <ArrowUpRight size={16} />
        </button>
        <a href="/">Back to site</a>
      </div>
    );
  return (
    <Dashboard
      demo={mode === "demo"}
      exit={async () => {
        if (mode === "live") {
          const r = await supabase.auth.signOut();
          if (r.error) throw new Error("Sign-out failed. Please try again.");
        }
        setMode("login");
      }}
    />
  );
}
function Dashboard({ demo, exit }: { demo: boolean; exit: () => void | Promise<void> }) {
  const [leads, setLeads] = useState<ChurchLead[]>(demo ? structuredClone(demoLeads) : []),
    [tab, setTab] = useState<"leads" | "integrations">("leads"),
    [selected, setSelected] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(!demo),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [settings, setSettings] = useState<Settings>({
      enabled: false,
      configured: false,
      destination: null,
      role: demo ? "owner" : "viewer",
    }),
    [hook, setHook] = useState(""),
    [auto, setAuto] = useState(false),
    [photo, setPhoto] = useState<string | null>(null),
    [notes, setNotes] = useState("");
  const current = leads.find((l) => l.id === selected);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".cc-detail button:not(:disabled),.cc-detail a,.cc-detail input:not(:disabled),.cc-detail select:not(:disabled),.cc-detail textarea:not(:disabled)",
        ),
      );
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [selected]);

  const canEdit = settings.role !== "viewer",
    canConfigure = ["owner", "admin"].includes(settings.role);
  async function load() {
    if (demo) return;
    setLoading(true);
    setError("");
    try {
      const result = await leadApi<{ leads: ChurchLead[]; settings: Settings }>("admin");
      setLeads(result.leads);
      setSettings(result.settings);
      setAuto(result.settings.enabled);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setNotes(current?.notes ?? "");
    setPhoto(null);
    if (!current?.photo_path) return;
    if (demo) {
      setPhoto(stage);
      return;
    }
    let active = true;
    leadApi<{ url: string }>(`photo/${current.id}`)
      .then((r) => {
        if (active) setPhoto(r.url);
      })
      .catch(() => {
        if (active) setError("Unable to load the sanctuary photo. Reopen the lead to retry.");
      });
    return () => {
      active = false;
    };
  }, [selected]);
  const visible = leads.filter(
    (l) =>
      (filter === "all" || l.status === filter) &&
      `${l.name} ${l.church_name} ${l.email} ${l.state}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function update(patch: { status?: Pipeline; notes?: string }) {
    if (!current) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = demo
        ? { ...current, ...patch }
        : await leadApi<ChurchLead>(`lead/${current.id}`, {
            method: "PATCH",
            body: { ...patch, updated_at: current.updated_at },
          });
      setLeads((rows) => rows.map((r) => (r.id === next.id ? { ...r, ...next } : r)));
      setNotice(demo ? "Demo change only." : "Saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    if (!current) return;
    if (demo) {
      setNotice(
        "Demo only. No data was sent. Connect Zapier in the live workspace to export leads.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await leadApi<{ message: string }>(`sync/${current.id}`, { method: "POST" });
      await load();
      setNotice(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (demo) {
      setNotice("Demo only. No webhook was saved or contacted.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await leadApi<Settings>("settings", {
        method: "PUT",
        body: { url: hook || undefined, enabled: auto },
      });
      setSettings(r);
      setHook("");
      setNotice("Connection saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    if (demo) {
      setNotice("Demo only. No test was sent.");
      return;
    }
    setBusy(true);
    try {
      await leadApi("test", { method: "POST" });
      setNotice(
        "Sample event accepted by Zapier. Check your Zap to finish mapping the CRM fields.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cc-shell">
      <aside className="cc-sidebar">
        <a href="/" className="cc-logo">
          <img src={logo} alt="Axis Displays" />
        </a>
        <p className="cc-kicker">WORKSPACE</p>
        <nav>
          <button
            className={tab === "leads" ? "active" : ""}
            onClick={() => {
              setTab("leads");
              setNotice("");
            }}
          >
            <LayoutDashboard size={18} /> Lead inbox <span>{leads.length}</span>
          </button>
          <button
            className={tab === "integrations" ? "active" : ""}
            onClick={() => {
              setTab("integrations");
              setSelected(null);
              setNotice("");
            }}
          >
            <Link2 size={18} /> Connections
          </button>
        </nav>
        <a className="cc-landing" href="/start/" target="_blank" rel="noreferrer">
          Open lead page <ArrowUpRight size={16} />
        </a>
        <div className="cc-account">
          <span className="cc-avatar">AX</span>
          <div>
            Axis Displays<small>{demo ? "Demo workspace" : settings.role + " access"}</small>
          </div>
          <button
            aria-label="Sign out"
            onClick={() => {
              Promise.resolve(exit()).catch((e) => setError(e.message));
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="cc-main">
        <header className="cc-top">
          <span>
            AXIS <span>/</span> {tab === "leads" ? "Lead inbox" : "Connections"}
          </span>
          <span className="cc-private">
            <Circle size={7} fill="currentColor" />
            {demo ? "SAMPLE DATA" : "PRIVATE WORKSPACE"}
          </span>
        </header>
        {demo && (
          <div className="cc-demo">
            DEMO MODE{" "}
            <span>Fictional leads. Changes stay in this session. Nothing is sent to a CRM.</span>
          </div>
        )}
        <div className="cc-heading">
          <div>
            <p className="cc-kicker">{tab === "leads" ? "YOUR PIPELINE" : "CONNECTED WORKFLOW"}</p>
            <h1>{tab === "leads" ? commandCopy.title : "From inquiry to CRM."}</h1>
            <p>
              {tab === "leads" ? commandCopy.subtitle : "Connect once. Keep your team in the loop."}
            </p>
          </div>
          {tab === "leads" && (
            <div className="cc-actions">
              <button className="cc-outline" disabled={loading} onClick={() => void load()}>
                <RefreshCw size={15} />
                Refresh
              </button>
              <button
                className="cc-primary"
                disabled={!visible.length}
                onClick={() => exportLeads(visible)}
              >
                <Download size={15} /> Export CSV
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="cc-error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="cc-notice" role="status">
            {notice}
          </div>
        )}
        {tab === "leads" ? (
          <>
            <div className="cc-metrics">
              {[
                ["Total inquiries", leads.length, "All received leads"],
                [
                  "New leads",
                  leads.filter((l) => l.status === "new").length,
                  "Ready for a first reply",
                ],
                [
                  "Qualified",
                  leads.filter((l) => l.status === "qualified").length,
                  "Projects taking shape",
                ],
                [
                  "Sent to Zapier",
                  leads.filter((l) => l.delivery?.status === "delivered").length,
                  "Webhook accepted",
                ],
              ].map(([label, value, caption], i) => (
                <article key={label}>
                  <div>
                    <span>{label}</span>
                    <span className={"cc-metric-icon tone-" + i}>
                      <Inbox size={16} />
                    </span>
                  </div>
                  <strong>{loading ? "—" : value}</strong>
                  <small>{caption}</small>
                </article>
              ))}
            </div>
            <section className="cc-inbox">
              <div className="cc-list-head">
                <h2>
                  Inquiries <span>{visible.length}</span>
                </h2>
                <label className="cc-search">
                  <Search size={17} />
                  <input
                    aria-label="Search leads"
                    placeholder="Search church, name or state"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="cc-filters">
                {["all", ...pipeline].map((s) => (
                  <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
                    {s === "all" ? "All leads" : s}
                    <span>
                      {s === "all" ? leads.length : leads.filter((l) => l.status === s).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="cc-table-head">
                <span>CHURCH / CONTACT</span>
                <span>LOCATION</span>
                <span>STATUS</span>
                <span>RECEIVED</span>
                <span>CRM</span>
              </div>
              {loading ? (
                <div className="cc-empty" role="status">
                  Loading inquiries…
                </div>
              ) : visible.length ? (
                visible.map((l) => (
                  <button
                    className="cc-row"
                    key={l.id}
                    onClick={() => {
                      setSelected(l.id);
                      setNotice("");
                      setError("");
                    }}
                  >
                    <span className="cc-contact">
                      <span className="cc-church-avatar">
                        {l.church_name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </span>
                      <span>
                        <strong>{l.church_name}</strong>
                        <small>
                          {l.name}
                          {l.photo_path && <Image size={12} />}
                        </small>
                      </span>
                    </span>
                    <span className="cc-location">{l.state}</span>
                    <span>
                      <span className={"cc-badge " + l.status}>{l.status}</span>
                    </span>
                    <span className="cc-date">
                      {new Date(l.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="cc-crm">
                      {l.delivery?.status === "delivered" ? (
                        <Check size={15} />
                      ) : l.delivery?.status === "failed" ? (
                        "Retry"
                      ) : l.delivery?.status === "sending" ? (
                        "Sending"
                      ) : (
                        "—"
                      )}
                      <ChevronRight size={15} />
                    </span>
                  </button>
                ))
              ) : (
                <div className="cc-empty">
                  <Inbox size={30} />
                  <h3>{search || filter !== "all" ? "No matching leads" : commandCopy.empty}</h3>
                  <p>
                    {search || filter !== "all"
                      ? "Try another search or status."
                      : commandCopy.emptyDetail}
                  </p>
                </div>
              )}
              <div className="cc-list-footer">
                Latest {leads.length} inquiries · up to 500 shown{" "}
                <span>Source: church landing page</span>
              </div>
            </section>
          </>
        ) : (
          <section className="cc-integrations">
            <div className="cc-integration-title">
              <span className="cc-zap">
                <Zap />
              </span>
              <div>
                <h2>Zapier</h2>
                <p>Send new church inquiries to the CRM you already use.</p>
              </div>
              <span className={"cc-badge " + (settings.configured ? "qualified" : "closed")}>
                {settings.configured ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="cc-steps">
              <div>
                <b>01</b>
                <h3>Create your Zap</h3>
                <p>Choose Webhooks by Zapier → Catch Hook as the trigger.</p>
              </div>
              <div>
                <b>02</b>
                <h3>Connect your inbox</h3>
                <p>Paste the hook below. Send a sample to map the fields.</p>
              </div>
              <div>
                <b>03</b>
                <h3>Choose your CRM</h3>
                <p>Create or update a contact using email, then turn on your Zap.</p>
              </div>
            </div>
            <form onSubmit={saveSettings}>
              <label>
                Zapier Catch Hook URL
                <input
                  type="url"
                  autoComplete="off"
                  placeholder="https://hooks.zapier.com/hooks/catch/…"
                  disabled={!canConfigure || busy}
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                />
              </label>
              {settings.configured && (
                <p className="cc-muted">
                  Destination saved: {settings.destination}. Leave the field blank to keep it.
                </p>
              )}
              <label className="cc-toggle">
                <input
                  type="checkbox"
                  checked={auto}
                  disabled={!canConfigure || busy}
                  onChange={(e) => setAuto(e.target.checked)}
                />
                <span>
                  Automatically send new inquiries
                  <small>
                    Failures remain in your inbox for retry. Existing leads can be sent
                    individually.
                  </small>
                </span>
              </label>
              <div className="cc-actions">
                <button className="cc-primary" disabled={!canConfigure || busy}>
                  Save connection <ArrowUpRight size={16} />
                </button>
                <button
                  type="button"
                  className="cc-outline"
                  disabled={!canConfigure || busy || (!demo && !settings.configured)}
                  onClick={() => void test()}
                >
                  Send sample event
                </button>
              </div>
            </form>
            <div className="cc-payload">
              <h3>What gets sent</h3>
              <p>
                Name, phone, email, state, church, description, lead ID and source. Photos remain
                private in this workspace.
              </p>
              <p>
                Use the event ID to avoid duplicates. “Sent” means Zapier accepted the webhook; your
                Zap’s task history confirms whether the CRM step completed.
              </p>
            </div>
          </section>
        )}
        <footer className="cc-bottom">
          AXIS DISPLAYS <span>Built for the next conversation.</span>
        </footer>
      </main>
      {current && tab === "leads" && (
        <div
          className="cc-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setSelected(null);
          }}
        >
          <section
            className="cc-detail"
            role="dialog"
            aria-modal="true"
            aria-label={`${current.church_name} inquiry`}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setSelected(null);
            }}
          >
            <div className="cc-detail-top">
              <span className="cc-kicker">INQUIRY DETAILS</span>
              <button autoFocus aria-label="Close inquiry" onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>
            <span className={"cc-badge " + current.status}>{current.status}</span>
            <h2>{current.church_name}</h2>
            <p className="cc-muted">
              {current.name} · {new Date(current.created_at).toLocaleString()}
            </p>
            <div className="cc-detail-contact">
              <a href={`mailto:${current.email}`}>
                <Mail size={17} />
                {current.email}
              </a>
              <a href={`tel:${current.phone.replace(/[^+\d]/g, "")}`}>
                <Phone size={17} />
                {current.phone}
              </a>
              <span>
                <MapPin size={17} />
                {current.state}
              </span>
            </div>
            <h3>Project brief</h3>
            <p className="cc-brief">{current.description}</p>
            {photo && (
              <div className="cc-detail-photo">
                <img
                  src={photo}
                  alt={demo ? "Sample sanctuary photo" : "Submitted sanctuary photo"}
                />
                <small>{demo ? "Sample photo" : "Private sanctuary photo"}</small>
              </div>
            )}
            <label>
              Follow-up status
              <select
                value={current.status}
                disabled={!canEdit || busy}
                onChange={(e) => void update({ status: e.target.value as Pipeline })}
              >
                {pipeline.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Internal notes
              <textarea
                rows={4}
                maxLength={5000}
                value={notes}
                disabled={!canEdit || busy}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Next steps, timing, and details from your conversation."
              />
            </label>
            <button
              className="cc-outline"
              disabled={!canEdit || busy || notes === current.notes}
              onClick={() => void update({ notes })}
            >
              Save notes
            </button>
            <div className="cc-sync">
              <div>
                <h3>CRM delivery</h3>
                <p>
                  {current.delivery?.status ?? "Not sent"}
                  {current.delivery?.attempts ? ` · ${current.delivery.attempts} attempt(s)` : ""}
                </p>
              </div>
              <button
                className="cc-primary"
                disabled={
                  !canEdit ||
                  busy ||
                  (!demo && !settings.configured) ||
                  current.delivery?.status === "delivered" ||
                  current.delivery?.status === "sending"
                }
                onClick={() => void sync()}
              >
                <Zap size={16} />
                {current.delivery?.status === "delivered" ? "Sent" : "Send to Zapier"}
              </button>
            </div>
            {notice && <p role="status">{notice}</p>}
            {error && (
              <p className="cc-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
