import { trackSavedLead } from "@/lib/meta-pixel";
import { trackTraffic } from "@/lib/traffic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, Layers, ArrowUpRight, Download } from "lucide-react";
import { studioCopy as copy, countPanels, type StudioDesign } from "@/config/studio";
import { builderInquiry, sendBuilderInquiry } from "@/lib/builder-inquiry";
function downloadDesign(design: StudioDesign) {
  const blob = new Blob([JSON.stringify({ version: 1, design }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "axis-wall-design.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function QuoteDialog({ onClose, design }: { onClose: () => void; design: StudioDesign }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submission = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const endpoint = import.meta.env["VITE_LEADS_ENDPOINT"];
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    church: "",
    notes: "",
  });
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    setError("");
    if (!endpoint) { setError("The form is temporarily unavailable. Please try again shortly."); return; }
    sending.current = true; setBusy(true);
    try {
      await sendBuilderInquiry(endpoint, builderInquiry(design, contact, submission.current));
      setReview(true);
      trackSavedLead(submission.current);
      void trackTraffic("quote_submitted", submission.current);
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "We couldn’t confirm your request. Please try again—your details are still here.");
    } finally { sending.current = false; setBusy(false); }
  }
  return (
    <dialog
      className="sd-dialog"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div>
        <button className="sd-close" onClick={onClose} aria-label="Close quote form">
          <X size={20} />
        </button>
        <span className="sd-eyebrow">YOUR DESIGN, YOUR QUOTE</span>
        <h2>{review ? copy.sentTitle : copy.quoteTitle}</h2>
        <p>
          {review
            ? copy.sentDetail
            : copy.quoteDetail}
        </p>
        <div className="sd-quote-summary">
          <Layers size={20} />
          <span>
            <strong>
              {design.sections.length} screen sections · {countPanels(design)} panels
            </strong>
            <small>
              Preview graphic:{" "}
              {copy.contents.find((c) => c.id === design.content)?.label}
            </small>
          </span>
        </div>
        {review ? (
          <>
            <dl className="sd-review">
              <dt>Name</dt>
              <dd>{contact.name}</dd>
              <dt>Email</dt>
              <dd>{contact.email}</dd>
              <dt>Location</dt>
              <dd>{contact.location}</dd>
              {contact.church && (
                <>
                  <dt>Church / venue</dt>
                  <dd>{contact.church}</dd>
                </>
              )}
              {contact.notes && (
                <>
                  <dt>Notes</dt>
                  <dd>{contact.notes}</dd>
                </>
              )}
            </dl>
            <p className="sd-preview-note" role="status">
              {copy.sentNote}
            </p>
            <div className="sd-dialog-actions">
              <button onClick={onClose}>Done</button>
              <button className="sd-primary" onClick={() => downloadDesign(design)}>
                Save my layout <Download size={16} />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>
              Your name
              <input
                required
                autoComplete="name"
                value={contact.name}
                maxLength={100}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={contact.email}
                maxLength={254}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </label>
            <label>
              Phone number
              <input required type="tel" autoComplete="tel" minLength={7} maxLength={40} value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })}/>
            </label>
            <label>
              City & state
              <input
                required
                autoComplete="address-level2"
                placeholder="Phoenix, Arizona"
                value={contact.location}
                maxLength={100}
                onChange={(e) => setContact({ ...contact, location: e.target.value })}
              />
            </label>
            <label>
              Church or venue
              <input
                required
                value={contact.church}
                maxLength={150}
                onChange={(e) => setContact({ ...contact, church: e.target.value })}
              />
            </label>
            <label>
              Anything else? <span>Optional</span>
              <textarea
                rows={2}
                value={contact.notes}
                maxLength={1000}
                placeholder="Your timeline, space, or ideas."
                onChange={(e) => setContact({ ...contact, notes: e.target.value })}
              />
            </label>
            <p role="alert">{error}</p>
            <button className="sd-primary" type="submit" disabled={busy || !endpoint}>
              {busy ? "Sending…" : copy.sendButton} <ArrowUpRight size={18} />
            </button>
            <p className="sd-preview-note">{copy.privacy}</p>
          </form>
        )}
      </div>
    </dialog>
  );
}
