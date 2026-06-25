import type { Preview } from "@storybook/web-components";

const preview: Preview = {
  parameters: {
    controls: { matchers: { date: /Date$/ } },
  },
};
export default preview;
