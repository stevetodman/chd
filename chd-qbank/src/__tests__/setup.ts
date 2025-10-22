import "@testing-library/jest-dom/vitest";

globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ||
  class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
