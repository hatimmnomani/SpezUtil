import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { RichtextDemoProps } from "./RichtextDemoClient";

export default function RichtextDemo(props: RichtextDemoProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading demo…</div>}>
      {() => {
        const Client = require("./RichtextDemoClient").default;
        return <Client {...props} />;
      }}
    </BrowserOnly>
  );
}
