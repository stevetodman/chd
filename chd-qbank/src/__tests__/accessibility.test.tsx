import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "../testing/render";
import { axe } from "jest-axe";

describe("accessibility smoke test", () => {
  it("reports no violations for accessible markup", async () => {
    // In real tests, import actual components here so missing ARIA labels,
    // color contrast issues, or other accessibility regressions are caught.
    const { container } = render(
      <main>
        <h1>Accessible heading</h1>
        <p>Helpful summary content that is easy to read.</p>
      </main>,
    );

    const results = await axe(container);

    expect(results.violations).toHaveLength(0);
  });
});
