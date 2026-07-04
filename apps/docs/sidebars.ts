import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    { type: "category", label: "Datepicker", items: ["datepicker/recipes"] },
  ],
};

export default sidebars;
