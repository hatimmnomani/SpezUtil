import React, { useEffect, useRef, useState } from "react";
import "@spezutil/richtext-editor";
import "@spezutil/hijri-datepicker"; // enables the Hijri date-picker popover in the toolbar
import type { ChangeDetail, SpezRichtext } from "@spezutil/richtext-editor";

export interface RichtextDemoProps {
  placeholder?: string;
  dir?: string;
  locale?: string;
  toolbar?: string;
  readonly?: boolean;
  initialHtml?: string;
}

export default function RichtextDemoClient(props: RichtextDemoProps): JSX.Element {
  const ref = useRef<SpezRichtext>(null);
  const [out, setOut] = useState("(type in the editor)");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (props.initialHtml) {
      el.initialHtml = props.initialHtml;
    }
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ChangeDetail>).detail;
      const json = detail.json.length > 160 ? `${detail.json.slice(0, 160)}…` : detail.json;
      setOut(`change: { isEmpty: ${detail.isEmpty}, json: ${json} }`);
    };
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="hijri-demo">
      {React.createElement("spez-richtext", {
        ref,
        placeholder: props.placeholder,
        dir: props.dir,
        locale: props.locale,
        toolbar: props.toolbar,
        readonly: props.readonly ? "" : undefined,
      })}
      <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{out}</pre>
    </div>
  );
}
