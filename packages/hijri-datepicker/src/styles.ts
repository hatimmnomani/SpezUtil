export const styles = `
:host {
  --dtp-bg: #fff;
  --dtp-fg: #1a1a1a;
  --dtp-muted: #9aa0a6;
  --dtp-accent: #0b7d3e;
  --dtp-accent-fg: #fff;
  --dtp-radius: 8px;
  display: inline-block;
  font-family: system-ui, sans-serif;
  color: var(--dtp-fg);
}
.cal { background: var(--dtp-bg); border: 1px solid #e0e0e0; border-radius: var(--dtp-radius); padding: 8px; width: 280px; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.header button { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 6px; color: var(--dtp-fg); }
.header button:hover { background: #f0f0f0; }
.title { font-weight: 600; text-align: center; }
.title small { display: block; font-weight: 400; color: var(--dtp-muted); font-size: 11px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dow { text-align: center; font-size: 11px; color: var(--dtp-muted); padding: 4px 0; }
.cell { aspect-ratio: 1; border: none; background: none; cursor: pointer; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; color: var(--dtp-fg); }
.cell:hover:not([disabled]) { background: #f0f0f0; }
.cell .greg { font-size: 9px; color: var(--dtp-muted); }
.cell.out { color: var(--dtp-muted); opacity: 0.5; }
.cell.today { outline: 1px solid var(--dtp-accent); }
.cell[aria-selected="true"] { background: var(--dtp-accent); color: var(--dtp-accent-fg); }
.cell[aria-selected="true"] .greg { color: var(--dtp-accent-fg); }
.cell[disabled] { cursor: not-allowed; opacity: 0.3; }
:host([dir="rtl"]) .cal { direction: rtl; }
`;
