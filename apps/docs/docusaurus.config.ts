import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";

// NOTE: organizationName/projectName/url/baseUrl are placeholders for GitHub Pages.
const config: Config = {
  title: "Digital Takeoff UI",
  tagline: "Hijri datepicker and community UI packages",
  url: "https://digitaltakeoff.github.io",
  baseUrl: "/db-sotware-packages/",
  organizationName: "digitaltakeoff",
  projectName: "db-sotware-packages",
  trailingSlash: false,
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  i18n: { defaultLocale: "en", locales: ["en"] },
  presets: [
    [
      "classic",
      {
        docs: { routeBasePath: "/", sidebarPath: "./sidebars.ts" },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: "Digital Takeoff UI",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
      ],
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
