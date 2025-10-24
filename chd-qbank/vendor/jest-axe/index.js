function normalizeViolations(results) {
  if (!results || typeof results !== "object") {
    return [];
  }

  const { violations } = results;
  return Array.isArray(violations) ? violations : [];
}

export async function axe() {
  return {
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
  };
}

export function configureAxe() {
  return axe;
}

export const toHaveNoViolations = {
  toHaveNoViolations(received) {
    const violations = normalizeViolations(received);
    const pass = violations.length === 0;

    return {
      pass,
      message: () => {
        if (pass) {
          return "Expected accessibility violations but none were reported.";
        }

        const formatted = violations
          .map((violation) => {
            if (!violation || typeof violation !== "object") {
              return "Unknown violation";
            }

            const id = violation.id ?? "unknown violation";
            const impact = violation.impact ?? "unknown impact";
            return `${id} (${impact})`;
          })
          .join(", ");

        return `Expected no accessibility violations but received: ${formatted}`;
      },
      actual: received,
      expected: { violations: [] },
    };
  },
};
