import * as React from "react";
import { createComponent, type EventName } from "@lit/react";
import {
  HijriDatepicker as HijriDatepickerElement,
  type ChangeDetail,
} from "@digitaltakeoff/hijri-datepicker";

export const HijriDatepicker = createComponent({
  tagName: "hijri-datepicker",
  elementClass: HijriDatepickerElement,
  react: React,
  events: {
    onChange: "change" as EventName<CustomEvent<ChangeDetail>>,
  },
});

export type {
  ChangeDetail,
  SingleChangeDetail,
  RangeChangeDetail,
  MultipleChangeDetail,
  RangeEndpoint,
} from "@digitaltakeoff/hijri-datepicker";
