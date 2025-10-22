import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

export function renderWithRouter(element: ReactElement, initialEntries: string[] = ["/"]): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
  );
}
