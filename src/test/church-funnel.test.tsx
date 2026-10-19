import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChurchFunnel } from "@/components/churches/church-funnel";
import { trackSavedLead } from "@/lib/meta-pixel";
vi.mock("@/lib/meta-pixel", () => ({ startPixel: vi.fn(), trackSavedLead: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_LEADS_ENDPOINT", "https://example.test/leads");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function qualify() {
  fill("Church name", "Example Church");
  fill("Your role", "Production / technical director");
  fill("Your involvement", "I recommend options to leadership");
  fill("Planned project budget", "$30,000–$50,000");
  fill("Installation timeline", "3–6 months");
  fireEvent.click(screen.getByRole("button", { name: /Continue to your details/ }));
}
it("routes below-threshold and unsure budgets to general information without submitting", () => {
  vi.stubGlobal("fetch", vi.fn());
  render(<ChurchFunnel />);
  fill("Planned project budget", "Under $30,000");
  expect(screen.getByRole("link", { name: /Get general/ }).getAttribute("href")).toBe("/compare/");
  expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(trackSavedLead).not.toHaveBeenCalled();
});
it("preserves qualification answers in the CRM description and tracks only confirmed success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) })),
  );
  const { container } = render(<ChurchFunnel />);
  qualify();
  fill("Full name", "Example Person");
  fill("Phone number", "2025550100");
  fill("Email address", "example@example.com");
  fill("City", "Phoenix");
  fill("State", "Arizona");
  fill("Tell us about your space and project", "Replace an existing projector.");
  fireEvent.submit(container.querySelector("form")!);
  await screen.findByText("Let’s plan your next step.");
  const data = vi.mocked(fetch).mock.calls[0]![1]!.body as FormData;
  expect(data.get("description")).toContain("Budget: $30,000–$50,000");
  expect(data.get("description")).toContain("Role: Production / technical director");
  expect(data.get("description")).toContain("Project: Replace an existing projector.");
  expect(data.get("church_name")).toBe("Example Church");
  expect(data.has("photo")).toBe(false);
  expect(trackSavedLead).toHaveBeenCalledWith(data.get("submission_id"));
});
it("keeps answers and never tracks a failed request", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false, json: async () => ({ success: false }) })),
  );
  const { container } = render(<ChurchFunnel />);
  qualify();
  fireEvent.submit(container.querySelector("form")!);
  await screen.findByRole("alert");
  expect(trackSavedLead).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Church name")).toHaveValue("Example Church");
});
