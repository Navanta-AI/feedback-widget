import { type AnnotationPayload, FEEDBACK_TYPES, type FeedbackPayload, type FeedbackResponse, type FeedbackType } from "@siteping/core";
import { el, parseSvg, setText } from "./dom-utils.js";
import { ICON_CSV, ICON_EXPORT, ICON_IMPORT, ICON_JSON } from "./icons.js";
import { type TFunction, tWithParams } from "./i18n/index.js";
import type { ThemeColors } from "./styles/theme.js";

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

export const EXPORT_CSS = `
  /* ============================
     Export Button & Menu
     ============================ */

  .sp-export-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--sp-radius);
    border: none;
    background: var(--sp-secondary);
    color: var(--sp-secondary-fg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
    position: relative;
  }

  .sp-export-btn svg {
    width: 14px;
    height: 14px;
  }

  .sp-export-btn:hover {
    background: var(--sp-secondary-hover);
  }

  .sp-export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-export-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 180px;
    padding: 4px;
    border-radius: var(--sp-radius);
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur));
    -webkit-backdrop-filter: blur(var(--sp-blur));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-lg);
    z-index: 10;
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
    transition: opacity 0.15s ease, transform 0.15s ease;
    pointer-events: none;
  }

  .sp-export-menu--open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .sp-export-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .sp-export-option:hover,
  .sp-export-option:focus-visible {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
  }

  .sp-export-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sp-export-option-icon svg {
    width: 16px;
    height: 16px;
  }

  .sp-export-option-label {
    flex: 1;
  }

  /* ============================
     Import Button
     ============================ */

  .sp-import-btn {
    height: 28px;
    min-width: 28px;
    padding: 0;
    border-radius: var(--sp-radius);
    border: none;
    background: var(--sp-secondary);
    color: var(--sp-secondary-fg);
    font-family: var(--sp-font);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .sp-import-btn svg {
    width: 14px;
    height: 14px;
  }

  /* Idle state is icon-only; the result flash ("Imported 3" / "Invalid file")
     temporarily expands the pill with the label text. */
  .sp-import-btn span:empty {
    display: none;
  }

  .sp-import-btn--success,
  .sp-import-btn--error {
    padding: 0 10px;
    gap: 4px;
  }

  .sp-import-btn:hover {
    background: var(--sp-secondary-hover);
  }

  .sp-import-btn:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .sp-import-btn--success {
    border-color: #008234;
    color: #008234;
    background: #ecfef3;
  }

  .sp-import-btn--error {
    border-color: var(--sp-danger);
    color: var(--sp-danger);
    background: var(--sp-danger-bg);
  }

  @media (forced-colors: active) {
    .sp-export-btn,
    .sp-export-option,
    .sp-export-menu,
    .sp-import-btn {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-export-btn:focus-visible,
    .sp-export-option:focus-visible,
    .sp-import-btn:focus-visible {
      outline: 3px solid Highlight !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// CSV / JSON conversion
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  "id",
  "type",
  "status",
  "message",
  "url",
  "authorName",
  "authorEmail",
  "createdAt",
  "resolvedAt",
  "viewport",
] as const;

/**
 * Escape a value for CSV. Two concerns, applied in order:
 *
 * 1. **Formula injection** — spreadsheet apps (Excel, Google Sheets,
 *    LibreOffice) treat a cell starting with `=`, `+`, `-`, `@`, or a leading
 *    TAB/CR as a formula. Columns like `message`, `authorName`, and `url` are
 *    arbitrary end-user input, so a payload such as `=HYPERLINK("http://evil",
 *    A1)` or `=cmd|'/c calc'!A1` would execute when a reviewer opens the export.
 *    We neutralize it by prefixing a single quote (the OWASP-recommended guard),
 *    which forces the cell to be treated as text.
 * 2. **RFC-4180 quoting** — wrap in double-quotes (doubling inner quotes) if the
 *    guarded value contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (guarded.includes('"') || guarded.includes(",") || guarded.includes("\n") || guarded.includes("\r")) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Convert feedbacks to CSV string */
export function feedbacksToCsv(feedbacks: FeedbackResponse[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = feedbacks.map((fb) =>
    CSV_COLUMNS.map((col) => {
      const raw = fb[col];
      return escapeCsvField(raw == null ? "" : String(raw));
    }).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Convert feedbacks to formatted JSON string */
export function feedbacksToJson(feedbacks: FeedbackResponse[]): string {
  return JSON.stringify(feedbacks, null, 2);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/** Trigger browser download of a string as file */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  // Clean up after a tick to ensure the download starts
  requestAnimationFrame(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  });
}

// ---------------------------------------------------------------------------
// JSON import — parse an exported feedbacks file back into payloads
// ---------------------------------------------------------------------------

/** One importable pin: the payload to send (minus projectName, which the
 *  importer scopes to the current project) plus whether it was resolved. */
export interface ImportedPin {
  payload: Omit<FeedbackPayload, "projectName">;
  resolved: boolean;
}

function isFeedbackType(v: unknown): v is FeedbackType {
  return typeof v === "string" && (FEEDBACK_TYPES as readonly string[]).includes(v);
}

const str = (v: unknown, fallback: string): string => (typeof v === "string" && v.length > 0 ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/**
 * Map one exported annotation (the flat `AnnotationResponse` shape produced by
 * "Export JSON") back to the nested `AnnotationPayload` a submission expects.
 * Also accepts already-nested payload-shaped objects (anchor + rect) verbatim.
 * Returns null for entries too malformed to anchor.
 */
function toAnnotationPayload(raw: unknown): AnnotationPayload | null {
  if (raw == null || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;

  // Already nested (payload-shaped) — trust its structure.
  if (a.anchor != null && a.rect != null && typeof a.anchor === "object" && typeof a.rect === "object") {
    return raw as AnnotationPayload;
  }

  const cssSelector = str(a.cssSelector, "");
  const xpath = str(a.xpath, "");
  if (!cssSelector && !xpath) return null; // nothing to anchor to

  return {
    anchor: {
      cssSelector: cssSelector || "body",
      xpath: xpath || "/html/body",
      textSnippet: str(a.textSnippet, ""),
      elementTag: str(a.elementTag, "DIV"),
      elementId: typeof a.elementId === "string" && a.elementId ? a.elementId : undefined,
      textPrefix: str(a.textPrefix, ""),
      textSuffix: str(a.textSuffix, ""),
      fingerprint: str(a.fingerprint, ""),
      neighborText: str(a.neighborText, ""),
      anchorKey: typeof a.anchorKey === "string" && a.anchorKey ? a.anchorKey : null,
    },
    rect: {
      xPct: num(a.xPct, 0),
      yPct: num(a.yPct, 0),
      wPct: num(a.wPct, 0.01),
      hPct: num(a.hPct, 0.01),
    },
    scrollX: num(a.scrollX, 0),
    scrollY: num(a.scrollY, 0),
    viewportW: Math.max(1, Math.round(num(a.viewportW, 1280))),
    viewportH: Math.max(1, Math.round(num(a.viewportH, 800))),
    devicePixelRatio: num(a.devicePixelRatio, 1),
  };
}

/**
 * Parse an "Export JSON" file back into importable pins.
 *
 * Liberal in what it accepts: unknown fields are ignored, missing scalars get
 * safe fallbacks, malformed annotations are dropped (a feedback with zero
 * usable annotations still imports — it just has no pin on the page). The
 * original `clientId` is preserved so stores that dedupe on it treat a
 * re-import as idempotent instead of duplicating.
 *
 * @throws {Error} when the file isn't valid JSON or isn't a non-empty array
 *   of objects with a usable `message`.
 */
export function parseFeedbacksJson(raw: string): ImportedPin[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Import failed: file is not valid JSON");
  }
  if (!Array.isArray(data)) throw new Error("Import failed: expected a JSON array of feedbacks");

  const pins: ImportedPin[] = [];
  for (const item of data) {
    if (item == null || typeof item !== "object") continue;
    const fb = item as Record<string, unknown>;
    const message = typeof fb.message === "string" ? fb.message.trim() : "";
    if (!message) continue; // message is the one field we refuse to invent

    const annotations = Array.isArray(fb.annotations)
      ? fb.annotations.map(toAnnotationPayload).filter((a): a is AnnotationPayload => a !== null)
      : [];

    pins.push({
      payload: {
        type: isFeedbackType(fb.type) ? fb.type : "other",
        message: message.slice(0, 5000),
        url: str(fb.url, "/"),
        urlPattern: typeof fb.urlPattern === "string" && fb.urlPattern ? fb.urlPattern : null,
        viewport: str(fb.viewport, "0x0"),
        userAgent: str(fb.userAgent, "imported"),
        authorName: str(fb.authorName, "Imported"),
        authorEmail: str(fb.authorEmail, "imported@feedback.local"),
        clientId: str(fb.clientId, typeof crypto !== "undefined" ? crypto.randomUUID() : `import-${Date.now()}-${pins.length}`),
        annotations,
        screenshotDataUrl: null,
      },
      resolved: fb.status === "resolved",
    });
  }

  if (pins.length === 0) throw new Error("Import failed: no usable feedbacks in file");
  return pins;
}

// ---------------------------------------------------------------------------
// ImportButton component — pill button + hidden file input
// ---------------------------------------------------------------------------

const IMPORT_FLASH_MS = 2200;

export class ImportButton {
  readonly element: HTMLElement;

  private readonly btn: HTMLButtonElement;
  private readonly label: HTMLSpanElement;
  private readonly input: HTMLInputElement;
  private flashTimer: number | undefined;
  private busy = false;

  /**
   * @param onImport Receives the raw file text; resolves with the number of
   *   pins actually imported. Rejections (invalid JSON, all items failed)
   *   surface as the error flash state.
   */
  constructor(
    private readonly onImport: (raw: string) => Promise<number>,
    private readonly t: TFunction,
  ) {
    this.element = el("div", { style: "display: inline-flex;" });

    this.input = document.createElement("input");
    this.input.type = "file";
    this.input.accept = "application/json,.json";
    this.input.style.display = "none";
    this.input.addEventListener("change", () => {
      const file = this.input.files?.[0];
      // Reset so picking the same file twice re-fires `change`.
      this.input.value = "";
      if (file) void this.handleFile(file);
    });

    // Icon-only idle state — the empty label span is display:none until a
    // result flash fills it ("Imported 3" / "Invalid file").
    this.btn = document.createElement("button");
    this.btn.className = "sp-import-btn";
    this.btn.setAttribute("aria-label", t("import.aria"));
    this.btn.title = t("import.label");
    this.btn.appendChild(parseSvg(ICON_IMPORT));
    this.label = document.createElement("span");
    this.label.setAttribute("aria-live", "polite");
    this.btn.appendChild(this.label);
    this.btn.addEventListener("click", () => {
      if (!this.busy) this.input.click();
    });

    this.element.appendChild(this.btn);
    this.element.appendChild(this.input);
  }

  private async handleFile(file: File): Promise<void> {
    this.busy = true;
    this.btn.disabled = true;
    try {
      const raw = await file.text();
      const count = await this.onImport(raw);
      this.flash("sp-import-btn--success", tWithParams(this.t, "import.success", { count }));
    } catch {
      this.flash("sp-import-btn--error", this.t("import.error"));
    } finally {
      this.busy = false;
      this.btn.disabled = false;
    }
  }

  /** Briefly tint the button + swap its label, then restore the idle state. */
  private flash(className: string, text: string): void {
    if (this.flashTimer !== undefined) clearTimeout(this.flashTimer);
    this.btn.classList.remove("sp-import-btn--success", "sp-import-btn--error");
    this.btn.classList.add(className);
    setText(this.label, text);
    this.flashTimer = window.setTimeout(() => {
      this.btn.classList.remove(className);
      setText(this.label, "");
      this.flashTimer = undefined;
    }, IMPORT_FLASH_MS);
  }

  destroy(): void {
    if (this.flashTimer !== undefined) clearTimeout(this.flashTimer);
    this.element.remove();
  }
}

// ---------------------------------------------------------------------------
// ExportButton component
// ---------------------------------------------------------------------------

export class ExportButton {
  readonly element: HTMLElement;

  private menu: HTMLElement;
  private isOpen = false;
  private onDocumentClick: (e: MouseEvent) => void;

  constructor(
    _colors: ThemeColors,
    private readonly getFeedbacks: () => FeedbackResponse[],
    t: TFunction,
  ) {
    // Wrapper for relative positioning of the menu
    this.element = el("div", { style: "position: relative; display: inline-flex;" });

    // Trigger button — matches .sp-btn-delete-all pill style
    const btn = document.createElement("button");
    btn.className = "sp-export-btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    // Icon-only trigger — the label lives in aria-label + title (tooltip).
    btn.setAttribute("aria-label", t("export.label"));
    btn.title = t("export.label");
    btn.appendChild(parseSvg(ICON_EXPORT));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Dropdown menu
    this.menu = el("div", { class: "sp-export-menu" });
    this.menu.setAttribute("role", "menu");

    // CSV option
    const csvOption = this.createOption(ICON_CSV, t("export.csv"), () => {
      this.exportAs("csv");
    });

    // JSON option
    const jsonOption = this.createOption(ICON_JSON, t("export.json"), () => {
      this.exportAs("json");
    });

    this.menu.appendChild(csvOption);
    this.menu.appendChild(jsonOption);

    this.element.appendChild(btn);
    this.element.appendChild(this.menu);

    // Close on outside click. composedPath() (not contains(e.target)) — the
    // listener is on `document`, so shadow-DOM retargeting rewrites e.target to
    // the host; composedPath() preserves the real in-shadow trigger so a second
    // click on it toggles closed instead of close-then-reopen.
    this.onDocumentClick = (e: MouseEvent) => {
      if (this.isOpen && !e.composedPath().includes(this.element)) {
        this.close();
      }
    };
    document.addEventListener("click", this.onDocumentClick, true);
  }

  private createOption(iconSvg: string, labelText: string, onClick: () => void): HTMLButtonElement {
    const option = document.createElement("button");
    option.className = "sp-export-option";
    option.setAttribute("role", "menuitem");

    const iconWrap = el("span", { class: "sp-export-option-icon" });
    iconWrap.appendChild(parseSvg(iconSvg));

    const labelEl = el("span", { class: "sp-export-option-label" });
    setText(labelEl, labelText);

    option.appendChild(iconWrap);
    option.appendChild(labelEl);

    option.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      this.close();
    });

    return option;
  }

  private toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  private open(): void {
    this.isOpen = true;
    this.menu.classList.add("sp-export-menu--open");
    const btn = this.element.querySelector<HTMLButtonElement>(".sp-export-btn");
    btn?.setAttribute("aria-expanded", "true");
  }

  private close(): void {
    this.isOpen = false;
    this.menu.classList.remove("sp-export-menu--open");
    const btn = this.element.querySelector<HTMLButtonElement>(".sp-export-btn");
    btn?.setAttribute("aria-expanded", "false");
  }

  private exportAs(format: "csv" | "json"): void {
    const feedbacks = this.getFeedbacks();
    if (feedbacks.length === 0) return;

    const projectName = feedbacks[0]?.projectName ?? "feedbacks";
    const date = new Date().toISOString().slice(0, 10);
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "csv") {
      const content = feedbacksToCsv(feedbacks);
      downloadFile(content, `feedbacks-${safeName}-${date}.csv`, "text/csv;charset=utf-8");
    } else {
      const content = feedbacksToJson(feedbacks);
      downloadFile(content, `feedbacks-${safeName}-${date}.json`, "application/json;charset=utf-8");
    }
  }

  destroy(): void {
    document.removeEventListener("click", this.onDocumentClick, true);
    this.element.remove();
  }
}
