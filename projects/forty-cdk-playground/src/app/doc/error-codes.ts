import { PLAYGROUND_GROUPS } from '../primitives';
import { GITHUB_BLOB_BASE } from '../ui/github';
import { ERROR_CODES } from '../../generated/error-codes.generated';

/**
 * One `FORCDK-<AREA>-<NNN>` failure, as the library declares it
 * ([#1736](https://github.com/tutkli/forty-cdk/issues/1736)).
 *
 * Nothing here is authored for the site. `scripts/lib/error-codes.mjs` reads
 * every emitter call in library source, so the page a reader lands on carries
 * the same sentence their console did.
 */
export interface ErrorCodeEntry {
  /** The code itself, e.g. `FORCDK-DIALOG-001`. */
  readonly code: string;
  /** The entry point the code's area names, e.g. `dialog`. */
  readonly area: string;
  /**
   * The entry point the `[forty-cdk/<scope>]` prefix names. `{primitive}` where
   * a shared check resolves it at runtime from the primitive that ran it.
   */
  readonly scope: string;
  /** Whether the library throws this or warns it, dev-gated. */
  readonly severity: 'error' | 'warning';
  /**
   * What went wrong, in the message's own words. `{name}` stands for a value
   * only the running library has — the piece that resolved nothing, the
   * breakpoint that was asked for.
   */
  readonly message: string;
  /** The `Cause` paragraph, or `null` where the message already says it. */
  readonly cause: string | null;
  /** The `Fix` paragraph, or `null` where there is no single action. */
  readonly fix: string | null;
  /** Repository path of the module that emits it. */
  readonly source: string;
  /** Line the emitter is called on. */
  readonly line: number;
}

/**
 * The `scope` a shared check publishes, which is resolved only when it runs.
 *
 * `FORCDK-CORE-*` covers infrastructure no primitive owns, and a shared check
 * reports under the primitive that ran it — so the prefix a consumer saw names
 * their own entry point rather than `core`, and the page has to say that instead
 * of naming one.
 */
export const RUNTIME_SCOPE = '{primitive}';

/** Every code the library can report, ordered by code. */
export const ERROR_CODE_INDEX: readonly ErrorCodeEntry[] = ERROR_CODES;

/** The codes one entry point declares, in code order. */
export interface ErrorCodeArea {
  /** The area segment, which is the entry point a consumer imported from. */
  readonly area: string;
  readonly codes: readonly ErrorCodeEntry[];
}

export const ERROR_CODE_AREAS: readonly ErrorCodeArea[] = (() => {
  const areas = new Map<string, ErrorCodeEntry[]>();
  for (const entry of ERROR_CODE_INDEX) {
    areas.set(entry.area, [...(areas.get(entry.area) ?? []), entry]);
  }
  return [...areas]
    .map(([area, codes]) => ({ area, codes }))
    .sort((a, b) => a.area.localeCompare(b.area));
})();

/**
 * The entry a code names, or `null` for a code the library does not emit —
 * which is what a reader who mistyped one, or kept a URL across a rename, has
 * to be told rather than shown an empty page.
 */
export function errorCodeByCode(code: string): ErrorCodeEntry | null {
  return ERROR_CODE_INDEX.find((entry) => entry.code === code) ?? null;
}

/** The first line the library prints, which is the line a reader searched for. */
export function errorCodeHeadline(entry: ErrorCodeEntry): string {
  return `[forty-cdk/${entry.scope}] ${entry.code}: ${entry.message}`;
}

/** Where the message is emitted, as a link into the source at that line. */
export function errorCodeSourceUrl(entry: ErrorCodeEntry): string {
  return `${GITHUB_BLOB_BASE}${entry.source}#L${entry.line}`;
}

/**
 * The route an area's own page is served under, or `null` where the site
 * publishes none.
 *
 * Two thirds of the roster's areas name a published primitive and the rest do
 * not: `FORCDK-CORE-*` is infrastructure no primitive owns, and an area whose
 * README is folded into another page has no route of its own. A missing link is
 * therefore the normal case rather than an error.
 */
export function publishedAreaSlug(area: string): string | null {
  for (const group of PLAYGROUND_GROUPS) {
    if (group.primitives.some((primitive) => primitive.slug === area)) {
      return area;
    }
  }
  return null;
}
