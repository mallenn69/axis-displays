import { useEffect, useRef, useState, type FormEvent } from "react";
import logo from "@/assets/axis-displays-logo.png";
import install from "@/assets/church-install-education.jpg";
import { churchFunnel as copy } from "@/config/church-funnel";
import { states, MAX_PHOTO_BYTES } from "@/config/leads";
import { startPixel, trackSavedLead } from "@/lib/meta-pixel";
import "./church-funnel.css";

export function ChurchFunnel() {
  const [step, setStep] = useState(1),
    [budget, setBudget] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const id = useRef(crypto.randomUUID());
  const form = useRef<HTMLFormElement>(null);
  const endpoint = import.meta.env["VITE_LEADS_ENDPOINT"];
  useEffect(() => {
    startPixel();
  }, []);
  const eligible = budget !== "" && budget !== "Under $30,000" && budget !== "Not sure yet";
  function next() {
    const fields = form.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "fieldset:not([hidden]) input, fieldset:not([hidden]) select",
    );
    if (fields && [...fields].some((field) => !field.reportValidity())) return;
    setStep(2);
    setError("");
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !eligible || step !== 2) return;
    const data = new FormData(event.currentTarget);
    const photo = data.get("photo");
    if (
      photo instanceof File &&
      photo.size &&
      (photo.size > MAX_PHOTO_BYTES ||
        !["image/jpeg", "image/png", "image/webp"].includes(photo.type))
    ) {
      setError("Choose a JPG, PNG, or WebP image up to 8 MB.");
      return;
    }
    if (photo instanceof File && !photo.size) data.delete("photo");
    data.set("submission_id", id.current);
    data.set(
      "description",
      [
        "Church consultation request — /churches/",
        `Role: ${data.get("role")}`,
        `Decision involvement: ${data.get("involvement")}`,
        `Budget: ${data.get("budget")}`,
        `Timeline: ${data.get("timeline")}`,
        `City: ${data.get("city")}`,
        `Project: ${data.get("project")}`,
      ].join("\n"),
    );
    if (!endpoint) {
      setError("This preview is not accepting requests yet.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error();
      setDone(true);
      trackSavedLead(id.current);
    } catch {
      setError("Your request wasn’t sent. Your details are still here—please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="church-funnel">
      <header>
        <a href="/" aria-label="Axis Displays home">
          <img src={logo} alt="Axis Displays" />
        </a>
        <span>CHURCH LED WALLS</span>
        <a href="#project">Plan your project ↗</a>
      </header>
      <section className="cf-hero">
        <p className="cf-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="cf-description">{copy.description}</p>
        <p className="cf-budget">{copy.budgetNote}</p>
        <a className="cf-button" href="#project">
          Tell us about your church <span>↗</span>
        </a>
      </section>
      <section className="cf-video-section" aria-labelledby="video-title">
        <div className="cf-video">
          {copy.videoUrl ? (
            <video
              controls
              preload="none"
              src={copy.videoUrl}
              aria-label="Axis church LED wall walkthrough"
            />
          ) : (
            <div className="cf-video-placeholder">
              <span>AXIS / INSIDE THE INSTALL</span>
              <h2>{copy.videoPlaceholder}</h2>
              <p>{copy.videoPlaceholderDetail}</p>
            </div>
          )}
        </div>
        <div className="cf-video-copy">
          <span className="cf-eyebrow">UNDERSTAND THE WHOLE SETUP</span>
          <h2 id="video-title">{copy.videoTitle}</h2>
          <p>{copy.videoDescription}</p>
        </div>
      </section>
      <section className="cf-proof">
        <img src={install} alt="An Axis LED wall installation during a church worship service" />
        <div>
          <p className="cf-eyebrow">A REAL AXIS INSTALLATION</p>
          <h2>
            Built for the room.
            <br />
            Ready for your team.
          </h2>
          <p>
            See the wall in use, then work through what a setup like this would require in your
            space.
          </p>
        </div>
      </section>
      <section className="cf-process">
        <p className="cf-eyebrow">FROM FIRST CONVERSATION TO FIRST SERVICE</p>
        <h2>Know what happens next.</h2>
        <div>
          {copy.steps.map((s, i) => (
            <article key={s.title}>
              <span>0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="cf-application" id="project">
        <aside>
          <p className="cf-eyebrow">YOUR PROJECT STARTS HERE</p>
          <h2>{copy.formTitle}</h2>
          <p>{copy.formIntro}</p>
          <ul>
            <li>A planned investment of $30,000+</li>
            <li>A real space and a project to discuss</li>
            <li>You’re involved in evaluating the options</li>
          </ul>
          <p className="cf-small">
            You don’t need to have every detail figured out. We’ll help you identify what’s needed
            before a design and proposal.
          </p>
        </aside>
        <div className="cf-form-card">
          {done ? (
            <div role="status" className="cf-success">
              <p className="cf-eyebrow">REQUEST RECEIVED</p>
              <h2>Let’s plan your next step.</h2>
              <p>
                We’ll review your project and contact you to arrange your consultation. No
                appointment has been booked yet.
              </p>
            </div>
          ) : (
            <form ref={form} onSubmit={send}>
              <p className="cf-progress">
                0{step} / 02 · {step === 1 ? "Your project" : "Your details"}
              </p>
              <fieldset hidden={step !== 1}>
                <legend>Tell us where you’re starting.</legend>
                <label>
                  Church name
                  <input name="church_name" autoComplete="organization" required maxLength={150} />
                </label>
                <div className="cf-fields">
                  <Select name="role" label="Your role" options={copy.roles} />
                  <Select name="involvement" label="Your involvement" options={copy.involvement} />
                </div>
                <label>
                  Planned project budget
                  <select
                    name="budget"
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a range
                    </option>
                    {copy.budgets.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <Select name="timeline" label="Installation timeline" options={copy.timelines} />
                {budget && !eligible ? (
                  <div className="cf-alternative" role="status">
                    <h3>{copy.belowBudgetTitle}</h3>
                    <p>{copy.belowBudgetText}</p>
                    <a href="/compare/">Get general LED wall information ↗</a>
                  </div>
                ) : (
                  <button className="cf-button" type="button" onClick={next}>
                    Continue to your details ↗
                  </button>
                )}
              </fieldset>
              <fieldset hidden={step !== 2}>
                <legend>Help us prepare for your conversation.</legend>
                <div className="cf-fields">
                  <label>
                    Full name
                    <input name="name" required={step === 2} autoComplete="name" maxLength={100} />
                  </label>
                  <label>
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      required={step === 2}
                      minLength={7}
                      maxLength={40}
                      autoComplete="tel"
                    />
                  </label>
                </div>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required={step === 2}
                    maxLength={254}
                    autoComplete="email"
                  />
                </label>
                <div className="cf-fields">
                  <label>
                    City
                    <input
                      name="city"
                      required={step === 2}
                      maxLength={100}
                      autoComplete="address-level2"
                    />
                  </label>
                  <Select name="state" label="State" options={states} required={step === 2} />
                </div>
                <label>
                  Tell us about your space and project
                  <textarea
                    name="project"
                    required={step === 2}
                    maxLength={1800}
                    rows={4}
                    placeholder="Your current screens, approximate stage size, and what you want to improve."
                  />
                </label>
                <label>
                  Stage photo{" "}
                  <span className="cf-small">Optional · JPG, PNG, WebP · up to 8 MB</span>
                  <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
                </label>
                <div className="cf-honey" aria-hidden="true">
                  <label>
                    Website
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                {error && (
                  <p role="alert" className="cf-error">
                    {error}
                  </p>
                )}
                <button className="cf-button" disabled={busy || !endpoint}>
                  {busy ? "Sending…" : "Request my consultation ↗"}
                </button>
                <button
                  className="cf-back"
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  ← Back to project details
                </button>
                <p className="cf-small">{copy.privacy}</p>
              </fieldset>
            </form>
          )}
        </div>
      </section>
      <footer>
        <img src={logo} alt="Axis Displays" />
        <p>LED walls. Design. Installation. Support.</p>
        <a href="/">Explore Axis Displays ↗</a>
      </footer>
    </main>
  );
}
function Select({
  name,
  label,
  options,
  required = true,
}: {
  name: string;
  label: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <select name={name} required={required} defaultValue="">
        <option value="" disabled>
          Select an option
        </option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
