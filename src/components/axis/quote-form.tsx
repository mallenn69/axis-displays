import { useState, useRef, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Lock, Mail, Phone, LoaderCircle } from "lucide-react";
import { GlassCard, GlassButton, Reveal } from "./glass";
import { site } from "@/config/site";
import { formFields, formCopy, quoteSchema } from "@/config/quote";
import { submitQuote } from "@/lib/quotes.functions";
import { sendBuilderInquiry } from "@/lib/builder-inquiry";
import { homepageInquiry } from "@/lib/homepage-inquiry";
export function QuoteForm() {
  const endpoint = import.meta.env["VITE_LEADS_ENDPOINT"];
  const preview = import.meta.env["VITE_DESIGN_PREVIEW"] === "true" && !endpoint;
  const submission = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const submit = useServerFn(submitQuote);
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [pending, setPending] = useState(false),
    [success, setSuccess] = useState(false),
    [failure, setFailure] = useState("");
  const reduced = useReducedMotion();
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview || sending.current) return;
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = quoteSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const field = String(i.path[0]);
        next[field] = i.message;
      });
      setErrors(next);
      const first = parsed.error.issues[0]?.path[0];
      if (first) {
        const input = e.currentTarget.elements.namedItem(String(first));
        if (input instanceof HTMLElement) input.focus();
      }
      return;
    }
    if (endpoint && String(values.phone ?? "").replace(/\D/g, "").length < 7) {
      setErrors({ phone: "Please enter a valid phone number." });
      return;
    }
    setErrors({});
    sending.current = true;
    setPending(true);
    setFailure("");
    try {
      if (endpoint)
        await sendBuilderInquiry(endpoint, homepageInquiry(parsed.data, submission.current));
      else await submit({ data: values });
      setSuccess(true);
    } catch {
      setFailure(formCopy.error);
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  return (
    <section id="quote" className="section-axis">
      <div className="container-axis quote-layout">
        <Reveal className="quote-copy">
          <span className="eyebrow eyebrow-accent">{site.labels.quote}</span>
          <h2 className="section-heading">{site.copy.quoteTitle}</h2>
          <span className="quote-panel-anchor" data-scene-anchor="quote" aria-hidden="true" />
          <p>{site.contact.reassurance}</p>
          <div className="contact-details">
            <a href={`tel:${site.contact.phone.replace(/\D/g, "")}`}>
              <Phone />
              {site.contact.phone}
            </a>
            <a href={`mailto:${site.contact.email}`}>
              <Mail />
              {site.contact.email}
            </a>
          </div>
        </Reveal>
        <Reveal>
          <GlassCard className="quote-form-panel">
            {success ? (
              <motion.div
                className="form-success"
                role="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <svg className="success-check" viewBox="0 0 32 32" fill="none">
                  <motion.path
                    d="m5 16 7 7L27 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6 }}
                  />
                </svg>
                <h3>{formCopy.successTitle}</h3>
                <p>{site.copy.success}</p>
              </motion.div>
            ) : (
              <form onSubmit={handle} noValidate>
                {preview && (
                  <p className="preview-form-notice">
                    Design preview — this form does not send requests yet.
                  </p>
                )}
                <div className="quote-form-grid">
                  {formFields.map((field) => (
                    <div
                      key={field.name}
                      className={`form-field ${field.wide ? "wide" : ""} ${errors[field.name] ? "invalid" : ""}`}
                    >
                      <label htmlFor={field.name}>
                        {field.label}
                        {field.required || (Boolean(endpoint) && field.name === "phone")
                          ? " *"
                          : ""}
                      </label>
                      {field.options ? (
                        <select
                          className="form-control"
                          id={field.name}
                          name={field.name}
                          defaultValue=""
                          aria-invalid={Boolean(errors[field.name])}
                          aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                          required={field.required || (Boolean(endpoint) && field.name === "phone")}
                        >
                          <option value="" disabled={field.required}>
                            {formCopy.choose}
                          </option>
                          {field.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : field.multiline ? (
                        <textarea
                          className="form-control"
                          id={field.name}
                          name={field.name}
                          maxLength={3000}
                        />
                      ) : (
                        <input
                          className="form-control"
                          id={field.name}
                          name={field.name}
                          type={field.type ?? "text"}
                          required={field.required || (Boolean(endpoint) && field.name === "phone")}
                          maxLength={field.name === "email" ? 255 : 150}
                          min={field.type === "number" ? 1 : undefined}
                          max={field.type === "number" ? 1000 : undefined}
                          autoComplete={
                            field.name === "name"
                              ? "name"
                              : field.name === "email"
                                ? "email"
                                : field.name === "phone"
                                  ? "tel"
                                  : field.name === "city"
                                    ? "address-level2"
                                    : field.name === "state"
                                      ? "address-level1"
                                      : undefined
                          }
                          aria-invalid={Boolean(errors[field.name])}
                          aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                        />
                      )}{" "}
                      {errors[field.name] && (
                        <p className="field-error" id={`${field.name}-error`}>
                          {errors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="honeypot" aria-hidden="true">
                  <label htmlFor="website">{formCopy.spamLabel}</label>
                  <input
                    id="website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                  />
                </div>
                {failure && (
                  <p className="field-error" role="alert">
                    {failure}
                  </p>
                )}
                <GlassButton
                  primary
                  type="submit"
                  disabled={pending || preview}
                  className={`form-submit ${pending ? "shimmer" : ""}`}
                >
                  {preview ? "Preview only" : pending ? site.buttons.sending : site.buttons.submit}
                  {pending ? <LoaderCircle className="animate-spin" /> : <ArrowUpRight />}
                </GlassButton>
                <p className="form-privacy">
                  <Lock />
                  {formCopy.privacy}
                </p>
              </form>
            )}
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}
