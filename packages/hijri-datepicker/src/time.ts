export interface Time {
  hour: number; // 0-23
  minute: number; // 0-59
}

export type Meridiem = "AM" | "PM";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseTime(s: string | null): Time | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime24(t: Time): string {
  return `${pad2(t.hour)}:${pad2(t.minute)}`;
}

export function to12(hour: number): { hour12: number; meridiem: Meridiem } {
  const meridiem: Meridiem = hour < 12 ? "AM" : "PM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return { hour12: h, meridiem };
}

export function from12(hour12: number, meridiem: Meridiem): number {
  let h = hour12 % 12;
  if (meridiem === "PM") h += 12;
  return h;
}

export function combineDateTime(dateIso: string, t: Time): string {
  return `${dateIso}T${formatTime24(t)}`;
}

export function splitDateTime(value: string | null): {
  date: string | null;
  time: Time | null;
} {
  if (!value) return { date: null, time: null };
  const [d, tt] = value.split("T");
  return { date: d ?? null, time: tt ? parseTime(tt) : null };
}
