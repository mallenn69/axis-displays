import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, Layers, ArrowUpRight, Download } from "lucide-react";
import { studioCopy as copy, countPanels, type StudioDesign } from "@/config/studio";
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
  const [contact, setContact] = useState({
    name: "",
    email: "",
    location: "",
    church: "",
    notes: "",
  });
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  function submit(e: FormEvent) {
    e.preventDefault();
    setReview(true);
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
        <h2>{review ? "Here’s your request." : copy.quoteTitle}</h2>
        <p>
          {review
            ? "This is a preview of the information that will go to the Axis team."
            : copy.quoteDetail}
        </p>
        <div className="sd-quote-summary">
          <Layers size={20} />
          <span>
            <strong>
              {design.sections.length} screen sections · {countPanels(design)} panels
            </strong>
            <small>
              {design.stageWidth} ft stage ·{" "}
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
              Nothing has been sent. We’re previewing the design and quote flow.
            </p>
            <div className="sd-dialog-actions">
              <button onClick={() => setReview(false)}>Edit details</button>
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
              City & state
              <input
                required
                autoComplete="address-level2"
                placeholder="Phoenix, Arizona"
                value={contact.location}
                maxLength={150}
                onChange={(e) => setContact({ ...contact, location: e.target.value })}
              />
            </label>
            <label>
              Church or venue <span>Optional</span>
              <input
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
                maxLength={2000}
                placeholder="Your timeline, space, or ideas."
                onChange={(e) => setContact({ ...contact, notes: e.target.value })}
              />
            </label>
            <button className="sd-primary" type="submit">
              Preview my quote request <ArrowUpRight size={18} />
            </button>
            <p className="sd-preview-note">{copy.previewNote}</p>
          </form>
        )}
      </div>
    </dialog>
  );
}
