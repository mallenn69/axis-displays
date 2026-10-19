import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChurchFunnel } from "@/components/churches/church-funnel";
import { ChurchQuiz } from "@/components/churches/church-quiz";
import { trackSavedLead } from "@/lib/meta-pixel";
vi.mock("@/lib/meta-pixel", () => ({ startPixel: vi.fn(), trackSavedLead: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_LEADS_ENDPOINT", "https://example.test/leads");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function next() {
  fireEvent.click(
    screen.getByRole("button", { name: /^(Continue|Skip photo|Review my answers|Save answer)/ }),
  );
}
function choose(name: string) {
  fireEvent.click(screen.getByRole("radio", { name }));
  next();
}
function fill(value: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
  next();
}
function start() {
  render(<ChurchQuiz />);
  choose("Replace our projector or screens");
}
function complete(photo?: File) {
  start();
  fireEvent.click(screen.getByRole("button", { name: "Use $30,000 as my budget" }));
  next();
  choose("Within 3 months");
  choose("Production / technical director");
  choose("I recommend options to leadership");
  fill("Example Church");
  fill("Phoenix");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Arizona" } });
  next();
  fill("Replace an existing projector.");
  if (photo)
    fireEvent.change(screen.getByLabelText("Have a photo of your stage?"), {
      target: { files: [photo] },
    });
  next();
  fill("Example Person");
  fill("example@example.com");
  fill("2025550100");
}
it("keeps the landing page focused on the video and a link to the separate quiz", () => {
  const { container } = render(<ChurchFunnel />);
  expect(screen.getByRole("link", { name: /I’m ready to plan my wall/ })).toHaveAttribute(
    "href",
    "/churches/quiz/",
  );
  expect(container.querySelector("form")).toBeNull();
  expect(screen.getByText(/Video coming soon/)).toBeVisible();
});
it("shows one question, the total, and remaining count; back keeps answers", () => {
  start();
  expect(screen.getByText("Question 2 of 13")).toBeVisible();
  expect(screen.getByText("11 remaining after this")).toBeVisible();
  expect(screen.queryByRole("textbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  expect(screen.getByRole("radio", { name: "Replace our projector or screens" })).toBeChecked();
});
it("requires a deliberate budget answer instead of silently accepting the slider default", () => {
  start();
  next();
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a budget");
  expect(screen.getByText("Question 2 of 13")).toBeVisible();
});
it.each(["0", "25000", "unknown"])(
  "routes budget %s to general information without a lead event",
  (budget) => {
    start();
    if (budget === "unknown")
      fireEvent.click(screen.getByRole("button", { name: "I’m not sure yet" }));
    else {
      fireEvent.change(screen.getByRole("slider"), { target: { value: budget } });
      expect(screen.getByRole("slider")).toHaveValue(budget);
    }
    next();
    expect(screen.getByRole("link", { name: /Get general information/ })).toHaveAttribute(
      "href",
      "/compare/",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(trackSavedLead).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Change my budget/ }));
    expect(screen.getByRole("slider")).toBeVisible();
  },
);
it("collects project answers first and lets users edit a review answer without repeating the quiz", () => {
  complete();
  expect(screen.getByRole("heading", { name: "Ready to take the next step?" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit: What city is your church in?" }));
  expect(screen.getByRole("textbox")).toHaveValue("Phoenix");
  fill("Mesa");
  expect(screen.getByRole("heading", { name: "Ready to take the next step?" })).toBeVisible();
  expect(screen.getByText("Mesa")).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves CRM mappings and sends only the saved submission ID to tracking", async () => {
  const photo = new File(["image"], "stage.jpg", { type: "image/jpeg" });
  complete(photo);
  fireEvent.click(screen.getByRole("button", { name: "Send my project details" }));
  await screen.findByText("Your project is with the Axis team.");
  const data = vi.mocked(fetch).mock.calls[0]![1]!.body as FormData;
  expect(data.get("church_name")).toBe("Example Church");
  expect(data.get("state")).toBe("Arizona");
  expect(data.get("description")).toContain("Budget: $30,000");
  expect(data.get("description")).toContain("Goal: Replace our projector or screens");
  expect(data.get("description")).toContain("Role: Production / technical director");
  expect(data.get("description")).toContain("Project: Replace an existing projector.");
  expect(data.get("photo")).toBe(photo);
  expect(trackSavedLead).toHaveBeenCalledExactlyOnceWith(data.get("submission_id"));
});
it("keeps answers after failure and retries the same submission without premature tracking", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal("fetch", request);
  complete();
  fireEvent.click(screen.getByRole("button", { name: "Send my project details" }));
  await screen.findByRole("alert");
  expect(trackSavedLead).not.toHaveBeenCalled();
  expect(screen.getByText("Example Church")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Send my project details" }));
  await screen.findByText("Your project is with the Axis team.");
  const first = request.mock.calls[0]![1].body as FormData,
    second = request.mock.calls[1]![1].body as FormData;
  expect(second.get("submission_id")).toBe(first.get("submission_id"));
  expect(second.has("photo")).toBe(false);
  expect(trackSavedLead).toHaveBeenCalledTimes(1);
});

it("allows skipping an invalid optional photo and never includes it in the request", async () => {
  complete();
  fireEvent.click(screen.getByRole("button", { name: "Edit: Have a photo of your stage?" }));
  fireEvent.change(screen.getByLabelText("Have a photo of your stage?"), {
    target: { files: [new File(["bad"], "document.pdf", { type: "application/pdf" })] },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPG, PNG, or WebP");
  next();
  fireEvent.click(screen.getByRole("button", { name: "Send my project details" }));
  await screen.findByText("Your project is with the Axis team.");
  const data = vi.mocked(fetch).mock.calls[0]![1]!.body as FormData;
  expect(data.has("photo")).toBe(false);
});
