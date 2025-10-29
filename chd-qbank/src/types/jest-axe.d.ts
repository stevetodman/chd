declare module "jest-axe" {
  type AxeNodeResult = {
    target: string[];
    html: string;
    failureSummary: string;
  };

  export type AxeResults = {
    violations: Array<{
      id: string;
      impact: string | null;
      description: string;
      help: string;
      helpUrl: string;
      nodes: AxeNodeResult[];
    }>;
    passes: unknown[];
    incomplete: unknown[];
    inapplicable: unknown[];
  };

  export function axe(
    element: Element | Document,
    options?: Record<string, unknown>
  ): Promise<AxeResults>;
}
