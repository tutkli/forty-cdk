import { isDevMode } from '@angular/core';

const CODE_PREFIX = 'FORCDK-';

/**
 * The four pieces every developer-facing message in the library is built from.
 *
 * `code` is the stable identity; `scope` only ever differs from the area the
 * code carries when a shared helper reports on behalf of a primitive it
 * resolves at runtime.
 */
export interface FortyMessageSpec {
  /**
   * Stable `FORCDK-<AREA>-<NNN>` identifier. Never reused for a second meaning:
   * a code names one concrete failure for as long as that failure exists.
   */
  readonly code: string;
  /** What is wrong, in one sentence, in the consumer's vocabulary. */
  readonly message: string;
  /** Why it happens — omitted when the message already says it. */
  readonly cause?: string;
  /** The concrete action that resolves it — omitted when there is no single action. */
  readonly fix?: string;
  /**
   * Entry-point name for the `[forty-cdk/<scope>]` prefix. Derived from
   * `code`'s area when omitted, which is what every call site outside
   * `forty-cdk/core` wants.
   */
  readonly scope?: string;
}

/** The entry-point name a code's area spells, e.g. `FORCDK-DATE-PICKER-001` → `date-picker`. */
function scopeOf(code: string): string {
  const end = code.lastIndexOf('-');
  if (!code.startsWith(CODE_PREFIX) || end <= CODE_PREFIX.length) {
    return 'core';
  }
  return code.slice(CODE_PREFIX.length, end).toLowerCase();
}

/**
 * Renders a {@link FortyMessageSpec} into the library's one message layout:
 *
 * ```text
 * [forty-cdk/dialog] FORCDK-DIALOG-001: ForDialogTitle must be used inside a [forDialog] element.
 *
 * Cause: No FOR_DIALOG_CONTEXT provider is visible from ForDialogTitle.
 *
 * Fix: Move ForDialogTitle inside a [forDialog] element.
 * ```
 *
 * The first line is self-sufficient — prefix, code and what went wrong — so a
 * consumer skimming a stack trace, and a search for the code, both land on it.
 * `Cause` and `Fix` are appended only when supplied.
 *
 * Exposed separately from {@link fortyError} for the one seam that takes a
 * pre-built message string from its caller — `AnchorSlot`'s duplicate-anchor
 * guard, reached by Combobox, Select and TimePicker, each of which owns the
 * `FORCDK-*` code for its own anchor. Prefer `fortyError` / `fortyWarn`
 * everywhere else.
 */
export function formatFortyMessage(spec: FortyMessageSpec): string {
  const scope = spec.scope ?? scopeOf(spec.code);
  let out = `[forty-cdk/${scope}] ${spec.code}: ${spec.message}`;
  if (spec.cause) {
    out += `\n\nCause: ${spec.cause}`;
  }
  if (spec.fix) {
    out += `\n\nFix: ${spec.fix}`;
  }
  return out;
}

/**
 * Builds the `Error` a primitive throws for a developer mistake. Call sites
 * keep the `throw` so the control flow stays visible to a reader and to
 * TypeScript's reachability analysis:
 *
 * ```ts
 * throw fortyError({ code: 'FORCDK-DRAWER-004', message: '…', fix: '…' });
 * ```
 *
 * This helper does **not** gate on `isDevMode()`. Whether a given check is
 * dev-only is a property of the check, not of the formatting — an orphan
 * context would fail with a bare `TypeError` one line later in production, so
 * those throw unconditionally, while a pure assertion gates inside its own
 * `assert*` / `throw*` helper as `.claude/rules/conventions.md` requires.
 */
export function fortyError(spec: FortyMessageSpec): Error {
  return new Error(formatFortyMessage(spec));
}

/**
 * Reports a developer mistake the library can recover from, in the same layout
 * as {@link fortyError}. Dev mode only — a warning's whole audience is the
 * developer, so the gate travels with the report and no call site can forget it.
 */
export function fortyWarn(spec: FortyMessageSpec): void {
  if (!isDevMode()) {
    return;
  }
  console.warn(formatFortyMessage(spec));
}
