type PlaywrightTestCallback = (args: { page: any }) => Promise<void> | void;

declare module "@playwright/test" {
  interface TestAPI {
    (name: string, fn: PlaywrightTestCallback): void;
    describe: (name: string, fn: () => void) => void;
    beforeEach: (fn: PlaywrightTestCallback) => void;
    afterEach: (fn: PlaywrightTestCallback) => void;
  }

  export const test: TestAPI;
  export const expect: any;
  export const devices: Record<string, Record<string, any>>;
  export function defineConfig(config: any): any;
}
