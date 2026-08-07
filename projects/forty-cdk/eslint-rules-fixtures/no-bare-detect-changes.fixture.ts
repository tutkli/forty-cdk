/**
 * Fixture for `forty-cdk/no-bare-detect-changes`.
 *
 * A synchronous `detectChanges()` runs the render and returns; it does not drain
 * the promise / RAF hops `@floating-ui/dom`'s `computePosition` and `autoUpdate`
 * need, so an assertion on the positioner's output that follows one reads the
 * *previous* position (or the anti-flash baseline) and passes for a reason
 * production never provides. Those assertions need `await
 * flushPositioning(fixture)`. See CLAUDE.md > Testing notes > Test isolation —
 * non-negotiables > rule 14.
 *
 * This file exists to prove the rule fires. Each `bad*` function below is an
 * intentional violation; the `ok*` functions are the shapes that must NOT be
 * flagged. The cases are one-per-function so each shape reads on its own — a
 * marker cannot leak across them, because `markerFor` anchors on the comments
 * directly above the call (`getCommentsBefore`) and so cannot reach past the
 * intervening code. `badMarkerDoesNotCarryOver` is the case that pins that:
 * widen the anchor back to a file-wide proximity scan and it goes green.
 */

declare const fixture: { detectChanges(): void };
declare const el: HTMLElement;
declare function flushPositioning(f?: unknown): Promise<void>;
declare function expect(actual: unknown): {
  toBe(expected: unknown): void;
  not: { toBe(expected: unknown): void };
};

/** Expected: 1× forty-cdk/no-bare-detect-changes — the positioner's `translate`. */
export function badTranslate(): void {
  fixture.detectChanges();
  expect(el.style.translate).not.toBe('');
}

/** Expected: 1× forty-cdk/no-bare-detect-changes — the anti-flash baseline. */
export function badClipPath(): void {
  fixture.detectChanges();
  expect(el.style.clipPath).toBe('inset(50%)');
}

/** Expected: 1× forty-cdk/no-bare-detect-changes — placement reflection. */
export function badDataSide(): void {
  fixture.detectChanges();
  expect(el.getAttribute('data-side')).toBe('top');
}

/**
 * Expected: 1× forty-cdk/no-bare-detect-changes — a positioner-written `--for-*`
 * custom property, read off the resolved surface.
 */
export function badAvailableHeight(): void {
  fixture.detectChanges();
  expect(el.style.getPropertyValue('--for-floating-available-height')).toBe('300px');
}

/**
 * Expected: 1× forty-cdk/no-bare-detect-changes. Aliasing the value out before
 * asserting on it does not evade the rule: the whole window between the render
 * and the next waiter is scanned, not only the lines carrying `expect(`.
 */
export function badAliasedRead(): void {
  fixture.detectChanges();
  const resolved = el.style.translate;
  expect(resolved).not.toBe('');
}

/**
 * Expected: 1× forty-cdk/no-bare-detect-changes (malformedMarker) — a bare
 * `@sanctioned-sync-render` with no parenthesised subject and no rationale names
 * nothing a reviewer can verify.
 */
export function badMalformedMarker(): void {
  // @sanctioned-sync-render
  fixture.detectChanges();
  expect(el.style.clipPath).toBe('inset(50%)');
}

/**
 * Expected: 1× forty-cdk/no-bare-detect-changes. Only a *line* comment whose
 * text starts with the phrase is a marker (#1606's anchoring), so this JSDoc
 * block quoting `@sanctioned-sync-render(clip-path-baseline): …` documents the
 * ledger rather than joining it and licenses nothing below it.
 */
export function badQuotingJsDoc(): void {
  fixture.detectChanges();
  expect(el.style.clipPath).toBe('inset(50%)');
}

/**
 * Expected: 1× forty-cdk/no-bare-detect-changes — on the *second* call. A marker
 * licenses the call it sits above and nothing else: the second render is
 * separated from it by an assertion, so it is unlicensed even though it is well
 * inside the marker's six-line window. `detectChanges()` is a one-line call, so
 * two reportable ones fit in that window trivially — this is the shape
 * `floating.spec.ts` already has (marker → call → two assertions), one render
 * away from a silent miss.
 */
export function badMarkerDoesNotCarryOver(): void {
  // @sanctioned-sync-render(clip-path-baseline): the armed baseline only exists
  // before the first position resolves.
  fixture.detectChanges();
  expect(el.style.clipPath).toBe('inset(50%)');

  fixture.detectChanges();
  expect(el.style.translate).not.toBe('');
}

/** Allowed: the un-drained render is the subject, and the marker says so. */
export function okMarked(): void {
  // @sanctioned-sync-render(clip-path-baseline): the armed baseline only exists
  // before the first position resolves.
  fixture.detectChanges();
  expect(el.style.clipPath).toBe('inset(50%)');
}

/**
 * Allowed: the window ends at the waiter, so the assertion belongs to the drain
 * rather than to the synchronous render.
 */
export async function okDrainedBefore(): Promise<void> {
  fixture.detectChanges();
  await flushPositioning(fixture);
  expect(el.style.translate).not.toBe('');
}

/**
 * Allowed: `--for-carousel-offset` is a host binding (`'[style.--for-carousel-
 * offset]'`), written by the very render that precedes it. The mark list is the
 * positioners' output vocabulary, not every `--for-*` property.
 */
export function okHostBoundCustomProperty(): void {
  fixture.detectChanges();
  expect(el.style.getPropertyValue('--for-carousel-offset')).toBe('-100%');
}

/** Allowed: an ARIA / `data-state` assertion the synchronous render produces. */
export function okHostBinding(): void {
  fixture.detectChanges();
  expect(el.getAttribute('data-state')).toBe('open');
}

/** Allowed: a setup render with no assertion before the next interaction. */
export function okSetup(): void {
  fixture.detectChanges();
  el.click();
}
