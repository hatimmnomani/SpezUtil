import { defineConfig } from "vitest/config";

export default defineConfig({
  // @lit/react ships a NODE_MODE (SSR) build under the "node" export condition
  // whose client-side prop/event application is compiled out. Vitest runs under
  // Node and would otherwise pick it, so force the browser build for jsdom tests.
  resolve: { conditions: ["browser", "development", "default"] },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
