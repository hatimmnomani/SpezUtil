import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { CalendarDemoProps } from "./CalendarDemoClient";

export default function CalendarDemo(props: CalendarDemoProps): JSX.Element {
  return (
    <BrowserOnly fallback={<div>Loading demo…</div>}>
      {() => {
        const Client = require("./CalendarDemoClient").default;
        return <Client {...props} />;
      }}
    </BrowserOnly>
  );
}
