import {
  ERROR_CODE_AREAS,
  ERROR_CODE_INDEX,
  errorCodeByCode,
  errorCodeHeadline,
  errorCodeSourceUrl,
  publishedAreaSlug,
  RUNTIME_SCOPE,
} from './error-codes';
import { APP_ROUTES } from './testing/doc-corpus';

/**
 * The `FORCDK-*` roster the site publishes a page per
 * ([#1736](https://github.com/tutkli/forty-cdk/issues/1736)).
 *
 * The scheme's guard lives in the library's own suite — `src/lib/error-codes.spec.ts`
 * fails on a malformed code, a duplicated one, an area that names no entry
 * point. Nothing here restates that. What is left is what publishing added: a
 * roster read over the AST rather than the text, whose prose for the two shape
 * helpers is **rebuilt** from the fields a call site declared, and two routes
 * that have to keep resolving for the code in a console to reach a page.
 */

/**
 * A floor rather than a count: the roster grows with every new check, and 126
 * codes today is not a number a test should pin. What it fails is a scan that
 * stopped seeing the call sites, which is the way this page could ship empty.
 */
const CODE_FLOOR = 100;

const CODE_PATTERN = /^FORCDK-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3}$/;

describe('the error code roster', () => {
  it('carries every code the library emits, each spelled to the scheme', () => {
    expect(ERROR_CODE_INDEX.length).toBeGreaterThanOrEqual(CODE_FLOOR);

    const malformed = ERROR_CODE_INDEX.filter((entry) => !CODE_PATTERN.test(entry.code));

    expect(malformed.map((entry) => entry.code)).toEqual([]);
  });

  it('spends no code on two pages, which would make one of them unreachable', () => {
    const codes = ERROR_CODE_INDEX.map((entry) => entry.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every code the message a consumer read, and a source line to open', () => {
    for (const entry of ERROR_CODE_INDEX) {
      expect(entry.message.trim()).not.toBe('');
      expect(entry.area).toBe(entry.code.slice('FORCDK-'.length, -4).toLowerCase());
      expect(entry.source.startsWith('projects/forty-cdk/')).toBe(true);
      expect(entry.source.endsWith('.ts')).toBe(true);
      expect(entry.line).toBeGreaterThan(0);
    }
  });

  /**
   * ~80 of the roster's messages are written by `orphanContextError` from the
   * piece, root and token a call site declares, and the generator reads that
   * template out of the helper rather than restating it — so what is worth
   * pinning here is the substitution, which is the part a template rewrite
   * could quietly drop. A `Cause` that stopped naming the token, or a `Fix`
   * that stopped naming the root, would leave prose that reads fine and tells
   * the reader nothing.
   *
   * The library's own suite owns the layout itself; nothing here restates it.
   * Importing the helper to compare against is not available either: the site's
   * unit-test program holds no library source, and the compiler plugin refuses
   * any file outside its program whose text names the Angular core package —
   * which every library module's first import line does.
   */
  it("substitutes a call site's fields into the prose its shape helper writes", () => {
    const entry = errorCodeByCode('FORCDK-ACCORDION-001');

    expect(entry!.message).toBe('{piece} must be used inside a [forAccordion] element.');
    expect(entry!.cause).toContain('No FOR_ACCORDION_CONTEXT provider is visible from {piece}.');
    expect(entry!.cause).toContain('ng-template');
    expect(entry!.fix).toContain('Move {piece} inside a [forAccordion] element');
  });

  it('substitutes them into the unresolved-root prose, which offers both remedies', () => {
    const entry = errorCodeByCode('FORCDK-POPOVER-002');

    expect(entry!.message).toBe('[forPopoverTrigger] could not resolve its [forPopover] root.');
    expect(entry!.cause).toContain('No FOR_POPOVER_CONTEXT provider is visible');
    expect(entry!.fix).toContain('Move [forPopoverTrigger] inside the [forPopover] element');
    expect(entry!.fix).toContain('#root="forPopover"');
  });

  /**
   * The headline is the line a reader searched for, so it is assembled the way
   * the library prints it: prefix, code, message, in that order.
   */
  it('publishes the first line the library prints', () => {
    const entry = errorCodeByCode('FORCDK-ACCORDION-001');

    expect(errorCodeHeadline(entry!)).toBe(
      '[forty-cdk/accordion] FORCDK-ACCORDION-001: {piece} must be used inside a [forAccordion] element.',
    );
  });

  /**
   * Nine `FORCDK-CORE-*` checks are shared, and report under the primitive that
   * ran them — a name only the running library has. The headline says so with a
   * placeholder rather than printing `core`, which would name an entry point the
   * consumer did not import.
   */
  it('says the prefix is resolved at runtime where a shared check reports it', () => {
    const shared = ERROR_CODE_INDEX.filter((entry) => entry.scope === RUNTIME_SCOPE);

    expect(shared.length).toBeGreaterThan(0);
    for (const entry of shared) {
      expect(errorCodeHeadline(entry)).toMatch(/^\[forty-cdk\/\{primitive}] FORCDK-CORE-\d{3}: /);
    }
  });

  /**
   * The other 117 prefixes are settled at build time, and a prefix is an entry
   * point name — the one field the derived scheme did not remove, since a shared
   * check types it by hand at the call site. A typo there reaches the page.
   */
  it('names an entry point in every prefix it resolves at build time', () => {
    const settled = ERROR_CODE_INDEX.filter((entry) => entry.scope !== RUNTIME_SCOPE);

    expect(settled.length).toBeGreaterThan(0);
    for (const scope of new Set(settled.map((entry) => entry.scope))) {
      expect(scope).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    }
  });

  it('reports a warning as a warning, since it never throws', () => {
    const warnings = ERROR_CODE_INDEX.filter((entry) => entry.severity === 'warning');

    expect(warnings.length).toBeGreaterThan(0);
    expect(ERROR_CODE_INDEX.filter((entry) => entry.severity === 'error').length).toBeGreaterThan(
      warnings.length,
    );
  });

  it('links the source at the line the message is emitted from', () => {
    const entry = ERROR_CODE_INDEX[0]!;

    expect(errorCodeSourceUrl(entry)).toBe(
      `https://github.com/tutkli/forty-cdk/blob/main/${entry.source}#L${entry.line}`,
    );
  });

  it('answers a code it does not publish with null rather than an empty page', () => {
    expect(errorCodeByCode('FORCDK-DIALOG-999')).toBeNull();
    expect(errorCodeByCode('')).toBeNull();
  });
});

describe('the error code index', () => {
  it('groups the whole roster by the entry point its area names', () => {
    const grouped = ERROR_CODE_AREAS.flatMap((area) => area.codes);

    expect(grouped).toHaveLength(ERROR_CODE_INDEX.length);
    for (const area of ERROR_CODE_AREAS) {
      expect(area.codes.length).toBeGreaterThan(0);
      for (const entry of area.codes) {
        expect(entry.area).toBe(area.area);
      }
    }
  });

  it('reads in entry point order, so a reader scans it the way they import', () => {
    const areas = ERROR_CODE_AREAS.map((area) => area.area);

    expect(areas).toEqual([...areas].sort((a, b) => a.localeCompare(b)));
    expect(new Set(areas).size).toBe(areas.length);
  });

  /**
   * `FORCDK-CORE-*` is infrastructure no primitive owns, and a folded entry
   * point has no route of its own — so an area without a page is the normal
   * case, and the link is offered only where it resolves.
   */
  it('offers a primitive page only for an area the site publishes one for', () => {
    expect(publishedAreaSlug('core')).toBeNull();
    expect(publishedAreaSlug('accordion')).toBe('accordion');

    const resolved = ERROR_CODE_AREAS.filter((area) => publishedAreaSlug(area.area) !== null);

    expect(resolved.length).toBeGreaterThan(ERROR_CODE_AREAS.length / 2);
  });
});

describe('the routes a code in a console reaches', () => {
  it('serves the index and a page per code', () => {
    expect(APP_ROUTES).toContain("path: 'errors'");
    expect(APP_ROUTES).toContain("path: 'errors/:code'");
    expect(APP_ROUTES).toContain("import('./pages/errors.page').then((m) => m.ErrorsPage)");
    expect(APP_ROUTES).toContain("import('./pages/error-code.page').then((m) => m.ErrorCodePage)");
  });

  /**
   * The index has to match its own path exactly: without `pathMatch: 'full'`
   * `/errors` would also be answered by the parameterised route's parent, and
   * the roster's own page would depend on route order.
   */
  it('matches the index exactly rather than by prefix', () => {
    const index = APP_ROUTES.slice(APP_ROUTES.indexOf("path: 'errors'"));

    expect(index.slice(0, index.indexOf('},'))).toContain("pathMatch: 'full'");
  });
});
