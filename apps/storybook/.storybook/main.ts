import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: { name: "@storybook/web-components-vite", options: {} },
  // Storybook does not serve a project's public/ directory by default (only its own internal
  // assets) — this is required for the vendored fonts in public/fonts/ (see preview-head.html)
  // to be reachable at /fonts/*.ttf instead of 404ing.
  staticDirs: ["../public"],
};
export default config;
