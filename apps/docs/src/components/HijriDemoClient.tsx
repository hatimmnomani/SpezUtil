import React, { useState } from "react";
import { HijriDatepicker } from "@digitaltakeoff/hijri-datepicker-react";

export interface HijriDemoProps {
  mode?: string;
  value?: string;
  start?: string;
  end?: string;
  min?: string;
  max?: string;
  enableTime?: boolean;
  timeFormat?: string;
  dir?: string;
}

export default function HijriDemoClient(props: HijriDemoProps): JSX.Element {
  const [out, setOut] = useState("(no selection yet)");
  return (
    <div className="hijri-demo">
      <HijriDatepicker
        {...props}
        onChange={(e: Event) =>
          setOut(JSON.stringify((e as CustomEvent).detail))
        }
      />
      <pre>{out}</pre>
    </div>
  );
}
