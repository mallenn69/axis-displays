import { trackTraffic } from "@/lib/traffic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import logo from "@/assets/axis-displays-logo.png";
import installation from "@/assets/church-install-education.jpg";
import stage from "@/assets/sanctuary-design-preview.jpg";
import {
  leadCopy as designLeadCopy,
  educationalLeadCopy,
  states,
  MAX_PHOTO_BYTES,
} from "@/config/leads";
import "./leads.css";
import { startPixel, trackSavedLead } from "@/lib/meta-pixel";
export function LeadPage({ educational = false }: { educational?: boolean }) {
  const leadCopy = educational ? educationalLeadCopy : designLeadCopy;
  useEffect(() => {
    startPixel();
  }, []);
  const [photo, setPhoto] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const submission = useRef(crypto.randomUUID());
  const endpoint = import.meta.env["VITE_LEADS_ENDPOINT"];
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!endpoint) {
      setError("This form is not accepting inquiries yet. Please check back shortly.");
      return;
    }
    const data = new FormData(e.currentTarget);
    data.set("submission_id", submission.current);
    if (photo) data.set("photo", photo);
    else data.delete("photo");
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error();
      setDone(true);
      void trackTraffic("quote_submitted", submission.current);
      trackSavedLead(submission.current);
    } catch {
      setError("Your inquiry wasn’t sent. Your details are still here—please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={educational ? "lead-page lead-educational" : "lead-page"}>
      <header>
        <a href="/" aria-label="Axis Displays home">
          <img src={logo} alt="Axis Displays" width="156" height="62" />
        </a>
        <span>CHURCH LED WALLS</span>
      </header>
      <div className="lead-layout">
        <section className="lead-intro">
          <div className="lead-photo">
            <img
              src={educational ? installation : stage}
              alt={
                educational
                  ? "Axis LED wall installation during a church worship service"
                  : "Split-view sanctuary concept showing an LED wall and its design blueprint"
              }
              width="1122"
              height="710"
            />
          </div>
          <div className="lead-heading">
            <p className="lead-eyebrow">{leadCopy.eyebrow}</p>
            <h1>{leadCopy.title}</h1>
            <p>{leadCopy.description}</p>
            {leadCopy.nextSteps && <p className="lead-next">{leadCopy.nextSteps}</p>}
          </div>
          <p className="lead-caption">{leadCopy.previewCaption}</p>
        </section>
        <section className="lead-card" aria-label="Project inquiry">
          {done ? (
            <div className="lead-success" role="status">
              <span aria-hidden="true">✓</span>
              <h2>{leadCopy.success}</h2>
              <p>{leadCopy.successDetail}</p>
              <a href="/">Explore Axis Displays ↗</a>
            </div>
          ) : (
            <form id="design-request" onSubmit={send}>
              <h2>{leadCopy.formTitle}</h2>
              <p className="lead-form-intro">{leadCopy.formIntro}</p>
              <p className="lead-required">
                {educational ? leadCopy.requiredNote : "All fields required except the photo."}
              </p>
              {!endpoint && (
                <p className="lead-preview-note">
                  Preview — inquiries will open once the form is connected.
                </p>
              )}
              <div className="lead-fields">
                <label>
                  Full name
                  <input name="name" autoComplete="name" required maxLength={100} />
                </label>
                <label>
                  Phone number
                  <input name="phone" type="tel" autoComplete="tel" required maxLength={40} />
                </label>
                <label className="lead-wide">
                  Email address
                  <input name="email" type="email" autoComplete="email" required maxLength={254} />
                </label>
                <label className="lead-wide">
                  {leadCopy.churchLabel}
                  <input name="church_name" autoComplete="organization" required maxLength={150} />
                </label>
                <label className="lead-wide">
                  {educational ? "Location (state)" : "State"}
                  <select name="state" autoComplete="address-level1" required defaultValue="">
                    <option value="" disabled>
                      Select your state
                    </option>
                    {states.map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </select>
                </label>
                <label className="lead-wide">
                  {leadCopy.notesLabel}
                  <textarea
                    name="description"
                    required
                    maxLength={3000}
                    rows={3}
                    placeholder={leadCopy.notesPlaceholder}
                  />
                </label>
              </div>
              {!educational && (
                <div className="lead-upload">
                  <label htmlFor="sanctuary-photo">
                    Sanctuary photo <span>Optional</span>
                  </label>
                  <p id="photo-help">
                    A view of your stage or sanctuary helps. JPG, PNG or WebP, up to 8 MB.
                  </p>
                  <input
                    ref={fileInput}
                    id="sanctuary-photo"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-describedby="photo-help"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setError("");
                      if (
                        f &&
                        (f.size > MAX_PHOTO_BYTES ||
                          !["image/jpeg", "image/png", "image/webp"].includes(f.type))
                      ) {
                        setError("Choose a JPG, PNG or WebP photo smaller than 8 MB.");
                        e.target.value = "";
                        setPhoto(null);
                        return;
                      }
                      setPhoto(f ?? null);
                    }}
                  />
                  {photo && (
                    <button
                      type="button"
                      className="lead-remove"
                      onClick={() => {
                        setPhoto(null);
                        if (fileInput.current) fileInput.current.value = "";
                      }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              )}
              <div className="lead-honey" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {error && (
                <p className="lead-error" role="alert">
                  {error}
                </p>
              )}
              <button className="lead-submit" type="submit" disabled={busy || !endpoint}>
                {busy ? "Sending…" : leadCopy.button}
                <span aria-hidden="true">↗</span>
              </button>
              <p className="lead-privacy">{leadCopy.privacy}</p>
            </form>
          )}
        </section>
      </div>
      <footer>
        AXIS DISPLAYS <span>LED walls for churches.</span>
      </footer>
    </main>
  );
}
