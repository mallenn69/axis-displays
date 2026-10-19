import { useEffect, useRef, useState, type FormEvent } from "react";
import { FunnelHeader } from "./church-funnel";
import {
  churchFunnel as copy,
  churchQuestions as questions,
  quizCopy,
  quizBudgetMaximum,
} from "@/config/church-funnel";
import { states, MAX_PHOTO_BYTES } from "@/config/leads";
import { startPixel, trackSavedLead } from "@/lib/meta-pixel";
import "./church-funnel.css";
export function ChurchQuiz() {
  const [step, setStep] = useState(0),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [photo, setPhoto] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [blocked, setBlocked] = useState(false),
    [editing, setEditing] = useState(false),
    [website, setWebsite] = useState("");
  const submission = useRef(crypto.randomUUID()),
    sending = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    photoInput = useRef<HTMLInputElement>(null);
  const endpoint = import.meta.env["VITE_LEADS_ENDPOINT"];
  const q = questions[step],
    review = step === questions.length;
  useEffect(() => {
    startPixel();
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step, blocked, done]);
  function answer(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
    setError("");
  }
  function back() {
    setError("");
    setBlocked(false);
    setStep((s) => Math.max(0, s - 1));
  }
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!q || busy) return;
    if (q.kind === "budget") {
      if (!answers["budget"]) {
        setError("Choose a budget, confirm the amount shown, or select “I’m not sure yet.”");
        return;
      }
      if (answers["budget"] === "Not sure yet" || Number(answers["budget"]) < 30000) {
        setBlocked(true);
        return;
      }
    }
    if (q.kind !== "photo" && !answers[q.id]?.trim()) {
      setError("Please answer this question to continue.");
      return;
    }
    setError("");
    setStep((s) => (editing ? questions.length : s + 1));
    setEditing(false);
  }
  async function send() {
    if (sending.current || done) return;
    if (!endpoint) {
      setError("This preview is not accepting requests yet.");
      return;
    }
    if (
      !questions.every((item) => item.kind === "photo" || answers[item.id]?.trim()) ||
      !Number.isFinite(Number(answers["budget"])) ||
      Number(answers["budget"]) < 30000
    ) {
      setError("Please complete your project answers before sending.");
      return;
    }
    const data = new FormData();
    ["name", "phone", "email", "church_name", "state"].forEach((key) =>
      data.set(key, answers[key]!),
    );
    data.set("submission_id", submission.current);
    data.set("website", website);
    if (photo) data.set("photo", photo);
    data.set(
      "description",
      [
        "Church consultation quiz — /churches/quiz/",
        `Goal: ${answers["goal"]}`,
        `Budget: $${Number(answers["budget"]).toLocaleString("en-US")}${Number(answers["budget"]) === quizBudgetMaximum ? "+" : ""}`,
        `Timeline: ${answers["timeline"]}`,
        `Role: ${answers["role"]}`,
        `Decision involvement: ${answers["involvement"]}`,
        `City: ${answers["city"]}`,
        `Project: ${answers["project"]}`,
      ].join("\n"),
    );
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error();
      trackSavedLead(submission.current);
      setDone(true);
    } catch {
      setError("Your request wasn’t sent. Your answers are still here—please try again.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const budgetValue =
    answers["budget"] !== undefined && Number.isFinite(Number(answers["budget"]))
      ? Number(answers["budget"])
      : 30000;
  return (
    <main className="church-funnel cf-quiz">
      <FunnelHeader />
      <section className="cq-shell">
        {!done && !blocked && (
          <div className="cq-progress">
            <p aria-live="polite">
              {review
                ? `All ${questions.length} questions answered`
                : `Question ${step + 1} of ${questions.length}`}
              <span>
                {review ? "Ready to send" : `${questions.length - step - 1} remaining after this`}
              </span>
            </p>
            <progress aria-label="Questions completed" value={step} max={questions.length} />
          </div>
        )}
        {done ? (
          <div className="cq-card" role="status">
            <p className="cf-eyebrow">NEXT STEP / YOUR CONSULTATION</p>
            <h1 ref={heading} tabIndex={-1}>
              {quizCopy.successTitle}
            </h1>
            <p>{quizCopy.successText}</p>
            <a className="cf-button" href="/churches/">
              Back to the walkthrough
            </a>
          </div>
        ) : blocked ? (
          <div className="cq-card" role="status">
            <h1 ref={heading} tabIndex={-1}>
              {copy.belowBudgetTitle}
            </h1>
            <p>{copy.belowBudgetText}</p>
            <a className="cf-button" href="/compare/">
              Get general information ↗
            </a>
            <button
              className="cf-back"
              onClick={() => {
                setBlocked(false);
                setError("");
              }}
            >
              ← Change my budget
            </button>
          </div>
        ) : review ? (
          <div className="cq-card">
            <h1 ref={heading} tabIndex={-1}>
              {quizCopy.reviewTitle}
            </h1>
            <p>{quizCopy.reviewHelp}</p>
            <dl className="cq-review">
              {questions.map((item, index) => (
                <div key={item.id}>
                  <dt>{item.title}</dt>
                  <dd>
                    {item.kind === "photo"
                      ? photo?.name || "No photo added"
                      : item.kind === "budget"
                        ? `$${Number(answers["budget"]).toLocaleString("en-US")}${Number(answers["budget"]) === quizBudgetMaximum ? "+" : ""}`
                        : answers[item.id]}
                  </dd>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setStep(index);
                      setEditing(true);
                      setError("");
                    }}
                    aria-label={`Edit: ${item.title}`}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </dl>
            {error && (
              <p role="alert" className="cf-error">
                {error}
              </p>
            )}
            <button className="cf-button" disabled={busy || !endpoint} onClick={() => void send()}>
              {busy ? "Sending…" : quizCopy.submit}
            </button>
            <label className="cf-honey" aria-hidden="true">
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
            <p className="cf-small">{copy.privacy}</p>
          </div>
        ) : (
          q && (
            <form className="cq-card" onSubmit={next} key={q.id}>
              <h1 ref={heading} tabIndex={-1} id="question-title">
                {q.title}
              </h1>
              {"help" in q && <p id="question-help">{q.help}</p>}
              {q.kind === "choice" ? (
                <div className="cq-options" role="radiogroup" aria-labelledby="question-title">
                  {q.options.map((option) => (
                    <label key={option} className={answers[q.id] === option ? "selected" : ""}>
                      <input
                        type="radio"
                        name={q.id}
                        required
                        checked={answers[q.id] === option}
                        onChange={() => answer(q.id, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : q.kind === "budget" ? (
                <div className="cq-budget">
                  <output htmlFor="budget-range">
                    {answers["budget"] === "Not sure yet"
                      ? "Not sure yet"
                      : `$${budgetValue.toLocaleString("en-US")}${budgetValue === quizBudgetMaximum ? "+" : ""}`}
                  </output>
                  <input
                    id="budget-range"
                    aria-label="Project budget"
                    type="range"
                    min="0"
                    max={quizBudgetMaximum}
                    step="5000"
                    value={budgetValue}
                    onChange={(e) => answer("budget", e.target.value)}
                  />
                  <div className="cq-range-labels">
                    <span>$0</span>
                    <span>${quizBudgetMaximum.toLocaleString("en-US")}+</span>
                  </div>
                  <button
                    type="button"
                    className="cq-budget-confirm"
                    onClick={() => answer("budget", String(budgetValue))}
                  >
                    Use ${budgetValue.toLocaleString("en-US")}
                    {budgetValue === quizBudgetMaximum ? "+" : ""} as my budget
                  </button>
                  <button
                    type="button"
                    className="cf-back"
                    onClick={() => answer("budget", "Not sure yet")}
                  >
                    {quizCopy.budgetUnknown}
                  </button>
                  <p className="cf-small">{copy.budgetNote}</p>
                </div>
              ) : q.kind === "state" ? (
                <select
                  aria-labelledby="question-title"
                  required
                  value={answers[q.id] || ""}
                  onChange={(e) => answer(q.id, e.target.value)}
                >
                  <option value="" disabled>
                    Select your state
                  </option>
                  {states.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : q.kind === "textarea" ? (
                <textarea
                  aria-labelledby="question-title"
                  required
                  maxLength={q.maxLength}
                  rows={5}
                  value={answers[q.id] || ""}
                  onChange={(e) => answer(q.id, e.target.value)}
                />
              ) : q.kind === "photo" ? (
                <div className="cq-photo">
                  <input
                    type="file"
                    ref={photoInput}
                    aria-labelledby="question-title"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (
                        file &&
                        (file.size > MAX_PHOTO_BYTES ||
                          !["image/jpeg", "image/png", "image/webp"].includes(file.type))
                      ) {
                        setPhoto(null);
                        setError("Choose a JPG, PNG, or WebP image up to 8 MB.");
                        e.target.value = "";
                        return;
                      }
                      setPhoto(file || null);
                      setError("");
                    }}
                  />
                  {photo && (
                    <p>
                      {photo.name}
                      <button
                        type="button"
                        className="cf-back"
                        onClick={() => {
                          setPhoto(null);
                          if (photoInput.current) photoInput.current.value = "";
                          setError("");
                        }}
                      >
                        Remove photo
                      </button>
                    </p>
                  )}
                </div>
              ) : (
                <input
                  aria-labelledby="question-title"
                  type={q.kind}
                  required
                  maxLength={q.maxLength}
                  minLength={q.kind === "tel" ? 7 : 1}
                  autoComplete={q.autoComplete}
                  value={answers[q.id] || ""}
                  onChange={(e) => answer(q.id, e.target.value)}
                />
              )}
              {error && (
                <p className="cf-error" role="alert">
                  {error}
                </p>
              )}
              <div className="cq-actions">
                {step > 0 && (
                  <button className="cf-back" type="button" onClick={back}>
                    ← {quizCopy.back}
                  </button>
                )}
                <button className="cf-button" type="submit">
                  {editing
                    ? "Save answer"
                    : q.kind === "photo" && !photo
                      ? "Skip photo"
                      : step === questions.length - 1
                        ? "Review my answers"
                        : quizCopy.continue}{" "}
                  ↗
                </button>
              </div>
            </form>
          )
        )}
      </section>
    </main>
  );
}
