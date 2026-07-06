import { html } from "lit-html";
import "@spezutil/hijri-datepicker";

export default {
  title: "Components/HijriDatepicker",
  argTypes: {
    mode: { control: "radio", options: ["single", "range", "multiple"] },
    value: { control: "text" },
    start: { control: "text" },
    end: { control: "text" },
    min: { control: "text" },
    max: { control: "text" },
    enableTime: { control: "boolean" },
    timeFormat: { control: "radio", options: ["24", "12"] },
    dir: { control: "radio", options: ["ltr", "rtl"] },
  },
};

interface Args {
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

const Template = (args: Args) => html`
  <hijri-datepicker
    mode=${args.mode ?? "single"}
    value=${args.value ?? ""}
    start=${args.start ?? ""}
    end=${args.end ?? ""}
    min=${args.min ?? ""}
    max=${args.max ?? ""}
    time-format=${args.timeFormat ?? "24"}
    dir=${args.dir ?? "ltr"}
    ?enable-time=${args.enableTime ?? false}
  ></hijri-datepicker>
`;

export const Default = Template.bind({});
(Default as any).args = { value: "2024-03-15" };

export const Range = Template.bind({});
(Range as any).args = { mode: "range", start: "2024-03-10", end: "2024-03-18" };

export const Multiple = Template.bind({});
(Multiple as any).args = { mode: "multiple", value: "2024-03-05,2024-03-12,2024-03-20" };

export const WithTime = Template.bind({});
(WithTime as any).args = { value: "2024-03-15", enableTime: true, timeFormat: "12" };

export const RightToLeft = Template.bind({});
(RightToLeft as any).args = { value: "2024-03-15", dir: "rtl" };
