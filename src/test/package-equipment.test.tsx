import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PackageEquipment } from "@/components/quotes/package-equipment";
import { emptyCatalog, newQuote } from "@/config/quote-workspace";
it("shows one representative case and switches equipment with the selected package", () => {
  const q = newQuote(emptyCatalog);
  q.supports = 3;
  const { rerender } = render(<PackageEquipment quote={q} />);
  expect(screen.getAllByRole("img", { name: "case illustration" })).toHaveLength(1);
  expect(screen.getByText("9 included · one case illustrated")).toBeTruthy();
  expect(screen.getByText("3 base plates · 3 truss sections · 9 clamps")).toBeTruthy();
  expect(screen.getByText("NovaStar VX1000 Pro")).toBeTruthy();
  rerender(
    <PackageEquipment
      quote={{ ...q, mount: "hung", bars: 2, slings: 4, cases: false, processor: "none" }}
    />,
  );
  expect(screen.queryByRole("img", { name: "support illustration" })).toBeNull();
  expect(screen.queryByRole("img", { name: "case illustration" })).toBeNull();
  expect(screen.queryByRole("img", { name: "processor illustration" })).toBeNull();
  expect(screen.getByRole("img", { name: "bar illustration" })).toBeTruthy();
  expect(screen.getByRole("img", { name: "sling illustration" })).toBeTruthy();
});
