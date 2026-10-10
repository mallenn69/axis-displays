import { createFileRoute } from "@tanstack/react-router";
import { AdminWorkspace } from "@/components/admin/workspace";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Axis | Private workspace" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminWorkspace,
});
