import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { WallVisualizer } from "@/components/quotes/wall-visualizer";
import { emptyCatalog } from "@/config/quote-workspace";
it("renders all repeated columns and uses actual cabinet proportions at a shared scale", () => {
  const sections = [
    { id: "a", name: "Main", type: "single" as const, wide: 2, tall: 2, quantity: 1 },
    { id: "b", name: "Column", type: "double" as const, wide: 1, tall: 2, quantity: 2 },
  ];
  const { container, rerender } = render(
    <WallVisualizer sections={sections} catalog={emptyCatalog} />,
  );
  expect(screen.getAllByRole("img")).toHaveLength(3);
  const rects = container.querySelectorAll("svg rect");
  expect(Number(rects[1].getAttribute("height"))).toBe(Number(rects[0].getAttribute("height")) * 2);
  expect(Number(rects[1].getAttribute("width"))).toBe(Number(rects[0].getAttribute("width")) / 2);
  expect(container.querySelectorAll("svg")[0].querySelectorAll("line")).toHaveLength(2);
  expect(container.querySelectorAll("svg")[1].querySelectorAll("line")).toHaveLength(3);
  expect(screen.getAllByRole("img")[1].getAttribute("aria-label")).toContain(
    "1 by 4 single-panel equivalents",
  );
  rerender(<WallVisualizer sections={[{ ...sections[0], wide: 4 }]} catalog={emptyCatalog} />);
  expect(screen.getAllByRole("img")).toHaveLength(1);
  expect(screen.getByRole("img").getAttribute("aria-label")).toContain("4 by 2");
});
