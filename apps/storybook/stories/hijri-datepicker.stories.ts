import { html } from "lit-html";
import "@digitaltakeoff/hijri-datepicker";

export default {
  title: "Components/HijriDatepicker",
  argTypes: {
    value: { control: "text" },
    min: { control: "text" },
    max: { control: "text" },
    dir: { control: "radio", options: ["ltr", "rtl"] },
  },
};

interface Args {
  value?: string;
  min?: string;
  max?: string;
  dir?: string;
}

const Template = (args: Args) => html`
  <hijri-datepicker
    value=${args.value ?? ""}
    min=${args.min ?? ""}
    max=${args.max ?? ""}
    dir=${args.dir ?? "ltr"}
  ></hijri-datepicker>
`;

export const Default = Template.bind({});
(Default as any).args = { value: "2024-03-15" };

export const WithRangeLimits = Template.bind({});
(WithRangeLimits as any).args = { value: "2024-03-15", min: "2024-03-10", max: "2024-03-25" };

export const RightToLeft = Template.bind({});
(RightToLeft as any).args = { value: "2024-03-15", dir: "rtl" };
