import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../components/ui/Button";

describe("Button component", () => {
  it("renders primary variant by default", () => {
    const html = renderToStaticMarkup(<Button>Click me</Button>);
    expect(html).toContain("Click me");
    expect(html).toContain("bg-brand-600");
  });

  it("applies secondary variant styles", () => {
    const html = renderToStaticMarkup(
      <Button variant="secondary">Action</Button>
    );
    expect(html).toContain("bg-neutral-100");
    expect(html).toContain("Action");
  });

  it("applies ghost variant styles", () => {
    const html = renderToStaticMarkup(
      <Button variant="ghost">Ghost</Button>
    );
    expect(html).toContain("bg-transparent");
    expect(html).toContain("Ghost");
  });
});
