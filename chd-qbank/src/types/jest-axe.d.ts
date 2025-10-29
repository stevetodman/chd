declare module "jest-axe" {
  import type { AxeResults } from "axe-core";

  export type AxeRunOptions = Record<string, unknown>;

  export function axe(
    element: Element | Document,
    options?: AxeRunOptions
  ): Promise<AxeResults>;

  export const toHaveNoViolations: {
    toHaveNoViolations(result?: AxeResults): {
      pass: boolean;
      message(): string;
    };
  };
}

declare global {
  namespace Vi {
    interface Assertion<_T = unknown> {
      toHaveNoViolations(): void;
    }
  }
}

declare module "vitest" {
  interface Assertion<_T = unknown> {
    toHaveNoViolations(): void;
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

export {};
