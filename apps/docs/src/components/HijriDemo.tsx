import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { HijriDemoProps } from "./HijriDemoClient";

export default function HijriDemo(props: HijriDemoProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading demo…</div>}>
      {() => {
        const Client = require("./HijriDemoClient").default;
        return <Client {...props} />;
      }}
    </BrowserOnly>
  );
}
