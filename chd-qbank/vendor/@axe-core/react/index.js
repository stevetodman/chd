export function withAxe(Component) {
  return Component;
}

export function useAxeResults() {
  return {
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
  };
}

export default {
  withAxe,
  useAxeResults,
};
