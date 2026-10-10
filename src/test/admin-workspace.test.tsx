import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminWorkspace } from "@/components/admin/workspace";
const mock = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  role: "owner",
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/axis/glass", () => ({
  GlassButton: ({ children, primary, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock("@/lib/admin", () => ({
  adminDb: {
    auth: {
      onAuthStateChange: (listener: typeof mock.listener) => {
        mock.listener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: (...args: unknown[]) => mock.signIn(...args),
      signOut: () => mock.signOut(),
    },
    from: (table: string) => ({
      select: () =>
        table === "staff_members"
          ? {
              eq: () => ({
                maybeSingle: async () => ({
                  data: mock.role ? { role: mock.role } : null,
                  error: null,
                }),
              }),
            }
          : { order: () => ({ limit: async () => ({ data: [], error: null }) }) },
    }),
  },
}));
afterEach(cleanup);
beforeEach(() => {
  mock.role = "owner";
  mock.signIn.mockReset();
  mock.signIn.mockResolvedValue({ error: null });
});
const auth = async (id?: string) => {
  act(() => mock.listener?.("INITIAL_SESSION", id ? { user: { id } } : null));
  await waitFor(() => expect(screen.queryByText("Checking access…")).toBeNull());
};
it("offers sign-in only and shows a generic credential failure", async () => {
  render(<AdminWorkspace />);
  await auth();
  expect(screen.queryByText(/sign up/i)).toBeNull();
  mock.signIn.mockResolvedValue({ error: new Error("invalid credentials") });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-only" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("Unable to sign in. Check your email and password.");
});
it("denies authenticated users without staff membership", async () => {
  mock.role = "";
  render(<AdminWorkspace />);
  await auth("uninvited");
  expect(screen.queryByText("Lead inbox")).toBeNull();
  expect(screen.getByRole("alert")).toHaveTextContent("does not have workspace access");
});
it("hides write controls for viewers", async () => {
  mock.role = "viewer";
  render(<AdminWorkspace />);
  await auth("viewer");
  await screen.findByText("New website inquiries will appear here.");
  expect(screen.queryByRole("button", { name: "New quote" })).toBeNull();
});
it("keeps an unsaved quote open when the token refreshes", async () => {
  render(<AdminWorkspace />);
  await auth("owner");
  fireEvent.click(await screen.findByRole("button", { name: "New quote" }));
  fireEvent.change(screen.getByLabelText("Quote title"), { target: { value: "Sunday stage" } });
  act(() => mock.listener?.("TOKEN_REFRESHED", { user: { id: "owner" } }));
  expect(screen.getByLabelText("Quote title")).toHaveValue("Sunday stage");
  act(() => mock.listener?.("SIGNED_IN", { user: { id: "owner" } }));
  expect(screen.getByLabelText("Quote title")).toHaveValue("Sunday stage");
});
