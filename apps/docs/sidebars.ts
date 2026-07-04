import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Datepicker",
      items: ["datepicker/getting-started", "datepicker/api", "datepicker/recipes"],
    },
    {
      type: "category",
      label: "Engine",
      items: ["engine/hijri-core"],
    },
  ],
};

export default sidebars;
