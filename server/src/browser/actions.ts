import type { Page } from "playwright";
import type { ActionVerb, BrowserScope, NormRect } from "./types.js";

export interface ComputerAction {
  action: string;
  coordinate?: [number, number];
  start_coordinate?: [number, number];
  text?: string;
  scroll_direction?: "up" | "down" | "left" | "right";
  scroll_amount?: number;
  duration?: number;
}

/** Actions that change page state and therefore pass through an approval gate. */
export const MUTATING_ACTIONS = new Set([
  "left_click",
  "right_click",
  "middle_click",
  "double_click",
  "triple_click",
  "left_click_drag",
  "left_mouse_down",
  "left_mouse_up",
  "type",
  "key",
  "hold_key",
]);

// Maps xdotool-style key names (used by Anthropic computer use) to Playwright keys.
const KEY_MAP: Record<string, string> = {
  Return: "Enter",
  KP_Enter: "Enter",
  Tab: "Tab",
  Escape: "Escape",
  BackSpace: "Backspace",
  Delete: "Delete",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Home: "Home",
  End: "End",
  Page_Up: "PageUp",
  Page_Down: "PageDown",
  space: " ",
  ctrl: "Control",
  control: "Control",
  alt: "Alt",
  shift: "Shift",
  super: "Meta",
  cmd: "Meta",
};

function mapKeyCombo(combo: string): string {
  return combo
    .split("+")
    .map((part) => KEY_MAP[part] ?? KEY_MAP[part.toLowerCase()] ?? part)
    .join("+");
}

export function describeAction(a: ComputerAction): string {
  switch (a.action) {
    case "left_click":
    case "right_click":
    case "double_click":
    case "triple_click":
      return `${a.action.replace("_", " ")} at (${a.coordinate?.join(", ")})`;
    case "type":
      return `type "${(a.text ?? "").slice(0, 60)}"`;
    case "key":
      return `press ${a.text}`;
    case "hold_key":
      return `hold ${a.text}`;
    case "left_mouse_down":
      return `mouse down at (${a.coordinate?.join(", ")})`;
    case "left_mouse_up":
      return `mouse up at (${a.coordinate?.join(", ")})`;
    case "left_click_drag":
      return `drag to (${a.coordinate?.join(", ")})`;
    case "scroll":
      return `scroll ${a.scroll_direction} ${a.scroll_amount ?? ""}`;
    default:
      return a.action;
  }
}

/** Executes a computer-use action against the Playwright page. Returns a screenshot afterwards. */
export async function runAction(page: Page, a: ComputerAction): Promise<void> {
  const [x, y] = a.coordinate ?? [0, 0];
  switch (a.action) {
    case "screenshot":
      return;
    case "mouse_move":
      await page.mouse.move(x, y);
      return;
    case "left_click":
      await page.mouse.click(x, y);
      return;
    case "right_click":
      await page.mouse.click(x, y, { button: "right" });
      return;
    case "middle_click":
      await page.mouse.click(x, y, { button: "middle" });
      return;
    case "double_click":
      await page.mouse.dblclick(x, y);
      return;
    case "triple_click":
      await page.mouse.click(x, y, { clickCount: 3 });
      return;
    case "left_click_drag": {
      const [sx, sy] = a.start_coordinate ?? [x, y];
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(x, y, { steps: 8 });
      await page.mouse.up();
      return;
    }
    case "type":
      if (a.text) await page.keyboard.type(a.text, { delay: 12 });
      return;
    case "key":
      if (a.text) await page.keyboard.press(mapKeyCombo(a.text));
      return;
    case "hold_key":
      if (a.text) await page.keyboard.down(mapKeyCombo(a.text));
      return;
    case "left_mouse_down":
      await page.mouse.move(x, y);
      await page.mouse.down();
      return;
    case "left_mouse_up":
      await page.mouse.move(x, y);
      await page.mouse.up();
      return;
    case "scroll": {
      const amount = (a.scroll_amount ?? 3) * 100;
      const dx = a.scroll_direction === "left" ? -amount : a.scroll_direction === "right" ? amount : 0;
      const dy = a.scroll_direction === "up" ? -amount : a.scroll_direction === "down" ? amount : 0;
      if (a.coordinate) await page.mouse.move(x, y);
      await page.mouse.wheel(dx, dy);
      return;
    }
    case "wait":
      await new Promise((r) => setTimeout(r, Math.min((a.duration ?? 1) * 1000, 5000)));
      return;
    case "cursor_position":
      return;
    default:
      return;
  }
}

export async function screenshotBase64(page: Page): Promise<string> {
  const buf = await page.screenshot({ type: "png" });
  return buf.toString("base64");
}

/** Coarse verb for the live operator UI (cursor/animation hints). */
export function verbOf(a: ComputerAction): ActionVerb {
  switch (a.action) {
    case "left_click":
    case "right_click":
    case "middle_click":
    case "double_click":
    case "triple_click":
    case "left_mouse_down":
    case "left_mouse_up":
      return "click";
    case "type":
      return "type";
    case "key":
    case "hold_key":
      return "key";
    case "left_click_drag":
      return "drag";
    case "scroll":
      return "scroll";
    case "wait":
      return "wait";
    default:
      return "screenshot";
  }
}

/** Permission scope for an action — drives the approval gate / matrix. */
export function scopeOf(a: ComputerAction): BrowserScope {
  if (a.action === "type" || a.action === "key" || a.action === "hold_key") {
    // Typing is usually form input; credential typing is blocked separately.
    return "form_submit";
  }
  // Clicks/drag can submit, post, or download — treated as form_submit by default;
  // navigation is gated by the URL policy, not the approval matrix.
  if (MUTATING_ACTIONS.has(a.action)) return "form_submit";
  return "navigate";
}

/**
 * Best-effort normalized bounding box of the element under a coordinate, so the
 * operator UI can highlight the target. Returns undefined for shadow DOM /
 * cross-origin iframes (the highlight is simply hidden in that case).
 */
export async function bestEffortBbox(
  page: Page,
  coordinate: [number, number],
  viewportWidth: number,
  viewportHeight: number,
): Promise<NormRect | undefined> {
  const px = Math.round(coordinate[0]);
  const py = Math.round(coordinate[1]);
  try {
    type DomRect = { x: number; y: number; width: number; height: number };
    type MiniDoc = {
      elementFromPoint(x: number, y: number): { getBoundingClientRect(): DomRect } | null;
    };
    const rect = await page.evaluate(
      ([x, y]: [number, number]) => {
        // Runs in the browser context; reference document via globalThis so the
        // server's (DOM-less) TS lib doesn't complain.
        const doc = (globalThis as unknown as { document?: MiniDoc }).document;
        const el = doc?.elementFromPoint(x, y);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      },
      [px, py] as [number, number],
    );
    if (!rect || rect.w === 0 || rect.h === 0) return undefined;
    return {
      x: rect.x / viewportWidth,
      y: rect.y / viewportHeight,
      w: rect.w / viewportWidth,
      h: rect.h / viewportHeight,
    };
  } catch {
    return undefined;
  }
}

/** Parse a `FINDING: severity | title | evidence | suggestion` line. */
export function parseFinding(
  line: string,
): { severity: string; title: string; evidence: string; suggestion: string } | null {
  const m = /^\s*FINDING:\s*(.+)$/i.exec(line);
  if (!m) return null;
  const parts = m[1].split("|").map((s) => s.trim());
  if (parts.length < 4) return null;
  const [severity, title, evidence, suggestion] = parts;
  if (!title || !evidence) return null;
  return { severity: severity.toLowerCase(), title, evidence, suggestion };
}
