import {
  Component,
  type ElementRef,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flushPositioning, installObserverPolyfills } from '../../../test-utils';
import { injectItemAlignedPositioner } from './item-aligned';

@Component({
  selector: 'item-aligned-listbox',
  template: `
    <button data-test-id="opt-1" role="option" type="button">One</button>
    <button data-test-id="opt-2" role="option" type="button">Two</button>
    <button data-test-id="opt-3" role="option" type="button" aria-disabled="true">Three</button>
    <button data-test-id="opt-4" role="option" type="button">Four</button>
  `,
})
class ItemAlignedListbox {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly selectedOption = signal<HTMLElement | null>(null);
  readonly collisionPadding = signal<number>(8);

  constructor() {
    injectItemAlignedPositioner({
      reference: this.reference,
      open: this.open,
      selectedOption: this.selectedOption,
      collisionPadding: this.collisionPadding,
      portal: false,
    });
  }
}

@Component({
  imports: [ItemAlignedListbox],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <item-aligned-listbox #lb />
    </div>
  `,
})
class Host {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly lb = viewChild.required<ItemAlignedListbox>('lb');
}

/**
 * `injectItemAlignedPositioner` is a layout-driven helper — its math (target
 * option center alignment, viewport clamping, available-height) only makes
 * sense against real `getBoundingClientRect()` reads, which jsdom returns as
 * zeros. Stubbing the rects (as this file used to) tautologically asserted
 * the math against the stubbed values rather than against real layout, so
 * per CLAUDE.md "Testing notes" the geometry coverage moved to Playwright —
 * `projects/forty-cdk-harness/e2e/select.e2e.ts` exercises the positioner
 * through the `[forSelectContent]` consumer that uses it.
 *
 * The wiring assertions that remain in this file confirm the construction
 * path (effect runs once `open` flips true, dependencies are reactive,
 * `data-position="item-aligned"` reaches the host) without faking layout.
 */
describe('injectItemAlignedPositioner', () => {
  // The positioner construction reads `ResizeObserver` — jsdom 28 still doesn't
  // ship it. Install a no-op polyfill for this spec only; the helper restores
  // `globalThis` in `afterAll` so the stub can't leak across files when Vitest
  // shares a worker (CI `pool: 'forks'` or `isolate: false`).
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('does not write a position until both open and reference are set', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;

    expect(lbEl.style.translate).toBe('');

    lb.reference.set(trigger);
    await flushPositioning(fixture);
    // Still closed — no positioning runs.
    expect(lbEl.style.translate).toBe('');

    lb.open.set(true);
    await flushPositioning(fixture);
    // After both signals are set, the positioner has run at least once: it
    // wrote the position to the `translate` property (NOT `transform`, which
    // stays free for consumer animations) and tagged the host with the
    // position mode. The actual numeric coordinates are layout-driven and
    // covered in `select.e2e.ts` against a real browser.
    expect(lbEl.style.translate).toMatch(/^-?\d+px -?\d+px$/);
    expect(lbEl.style.transform).toBe('');
    expect(lbEl.dataset['position']).toBe('item-aligned');
  });

  it('runs without throwing when nothing is selected and falls back to the first enabled option', async () => {
    // Wiring check for the `selectedOption ?? findFirstEnabledOption(floating)`
    // branch in `itemAligned` middleware: when no option is selected, the
    // helper queries the listbox for the first non-`aria-disabled`
    // `[role="option"]`. The DOM-visible side effect that confirms the path
    // ran is the `data-position="item-aligned"` tag — the *coordinate*
    // produced by the fallback is what `select.e2e.ts` checks.
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;

    lb.reference.set(trigger);
    // No selection — helper picks the first enabled `[role="option"]`.
    lb.open.set(true);
    await flushPositioning(fixture);

    expect(lbEl.dataset['position']).toBe('item-aligned');
    expect(lbEl.style.translate).toMatch(/^-?\d+px -?\d+px$/);
  });

  it('clears translate / --for-* / data-position on close so a reopen starts clean', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;

    lb.reference.set(trigger);
    lb.open.set(true);
    await flushPositioning(fixture);

    // Sanity: the positioner wrote everything on open.
    expect(lbEl.dataset['position']).toBe('item-aligned');
    expect(lbEl.style.translate).not.toBe('');
    expect(lbEl.style.getPropertyValue('--for-anchor-width')).not.toBe('');
    expect(lbEl.style.getPropertyValue('--for-anchor-height')).not.toBe('');
    expect(lbEl.style.getPropertyValue('--for-select-content-available-height')).not.toBe('');

    lb.open.set(false);
    await flushPositioning(fixture);

    // Closed: every style, CSS var, and data-* attribute is wiped, including
    // the clip-path baseline.
    expect(lbEl.dataset['position']).toBeUndefined();
    expect(lbEl.style.translate).toBe('');
    expect(lbEl.style.getPropertyValue('clip-path')).toBe('');
    expect(lbEl.style.getPropertyValue('--for-anchor-width')).toBe('');
    expect(lbEl.style.getPropertyValue('--for-anchor-height')).toBe('');
    expect(lbEl.style.getPropertyValue('--for-select-content-available-height')).toBe('');

    // Reopen: the positioner runs clean and re-writes the position.
    lb.open.set(true);
    await flushPositioning(fixture);
    expect(lbEl.dataset['position']).toBe('item-aligned');
    expect(lbEl.style.translate).toMatch(/^-?\d+px -?\d+px$/);
  });
});
