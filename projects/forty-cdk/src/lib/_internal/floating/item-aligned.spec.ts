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

interface MockRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function mockRect(el: Element, rect: MockRect): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        x: rect.left,
        y: rect.top,
        top: rect.top,
        left: rect.left,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        width: rect.width,
        height: rect.height,
        toJSON() {
          return rect;
        },
      }) as DOMRect,
  });
}

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

const ORIGINAL_INNER_HEIGHT = window.innerHeight;

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

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: ORIGINAL_INNER_HEIGHT,
    });
  });

  function setViewportHeight(h: number): void {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: h });
  }

  it('aligns the selected option center with the trigger center on the cross axis', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;
    const opt2 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-2"]')!;

    // Trigger sits at y=400, height 32 → center at 416.
    mockRect(trigger, { top: 400, left: 100, width: 200, height: 32 });
    // Listbox is taller-but-fits: top 0, height 160 (4 options × 40).
    mockRect(lbEl, { top: 0, left: 0, width: 200, height: 160 });
    // opt-2 is the second item: top 40, height 40 → center 60 relative to listbox top.
    mockRect(opt2, { top: 40, left: 0, width: 200, height: 40 });

    lb.reference.set(trigger);
    lb.selectedOption.set(opt2);
    lb.open.set(true);
    await flushPositioning(fixture);

    // Desired Y = 416 - 60 = 356. Within [8, 800-160-8=632].
    const transform = lbEl.style.transform;
    expect(transform).toMatch(/translate\(100px, 356px\)/);
    expect(lbEl.dataset['position']).toBe('item-aligned');
  });

  it('falls back to the first enabled option when nothing is selected', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;
    const opt1 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-1"]')!;

    mockRect(trigger, { top: 400, left: 100, width: 200, height: 32 });
    mockRect(lbEl, { top: 0, left: 0, width: 200, height: 160 });
    // First option center: top 0 + height/2 = 20.
    mockRect(opt1, { top: 0, left: 0, width: 200, height: 40 });

    lb.reference.set(trigger);
    // No selection — helper finds [role="option"] not aria-disabled.
    lb.open.set(true);
    await flushPositioning(fixture);

    // Desired Y = 416 - 20 = 396.
    expect(lbEl.style.transform).toMatch(/translate\(100px, 396px\)/);
  });

  it('skips aria-disabled options when falling back to the first enabled', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;

    // Mark opt-1 disabled too — only opt-2 remains as the first enabled.
    lbEl
      .querySelector<HTMLElement>('[data-test-id="opt-1"]')!
      .setAttribute('aria-disabled', 'true');
    const opt2 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-2"]')!;

    mockRect(trigger, { top: 400, left: 100, width: 200, height: 32 });
    mockRect(lbEl, { top: 0, left: 0, width: 200, height: 160 });
    mockRect(opt2, { top: 40, left: 0, width: 200, height: 40 });

    lb.reference.set(trigger);
    lb.open.set(true);
    await flushPositioning(fixture);

    // Aligns over opt-2 (center 60) → 416 - 60 = 356.
    expect(lbEl.style.transform).toMatch(/translate\(100px, 356px\)/);
  });

  it('clamps to the viewport top when the desired Y goes negative', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;
    const opt4 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-4"]')!;

    // Trigger near top of viewport, but the selected option is the LAST in
    // the listbox → desired Y = trigger.center.y - opt4.center → very negative.
    mockRect(trigger, { top: 16, left: 100, width: 200, height: 32 });
    mockRect(lbEl, { top: 0, left: 0, width: 200, height: 160 });
    mockRect(opt4, { top: 120, left: 0, width: 200, height: 40 });

    lb.reference.set(trigger);
    lb.selectedOption.set(opt4);
    lb.open.set(true);
    await flushPositioning(fixture);

    // Desired Y = 32 - 140 = -108. Clamp to padding (8).
    expect(lbEl.style.transform).toMatch(/translate\(100px, 8px\)/);
  });

  it('clamps to padding when the listbox is taller than the viewport', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(400);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;
    const opt2 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-2"]')!;

    mockRect(trigger, { top: 200, left: 100, width: 200, height: 32 });
    // Listbox is 600 tall — taller than viewport (400).
    mockRect(lbEl, { top: 0, left: 0, width: 200, height: 600 });
    mockRect(opt2, { top: 40, left: 0, width: 200, height: 40 });

    lb.reference.set(trigger);
    lb.selectedOption.set(opt2);
    lb.open.set(true);
    await flushPositioning(fixture);

    // maxY = 400 - 600 - 8 = -208 < minY=8 → snap to minY (padding).
    expect(lbEl.style.transform).toMatch(/translate\(100px, 8px\)/);
  });

  it('writes anchor and available-height CSS variables', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;
    const opt1 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-1"]')!;

    mockRect(trigger, { top: 100, left: 50, width: 240, height: 36 });
    mockRect(lbEl, { top: 0, left: 0, width: 240, height: 160 });
    mockRect(opt1, { top: 0, left: 0, width: 240, height: 40 });

    lb.reference.set(trigger);
    lb.selectedOption.set(opt1);
    lb.open.set(true);
    await flushPositioning(fixture);

    expect(lbEl.style.getPropertyValue('--for-anchor-width')).toBe('240px');
    expect(lbEl.style.getPropertyValue('--for-anchor-height')).toBe('36px');
    // viewport - 2 * padding = 800 - 16 = 784.
    expect(lbEl.style.getPropertyValue('--for-select-content-available-height')).toBe('784px');
  });

  it('honors a custom collisionPadding', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;
    const opt4 = lbEl.querySelector<HTMLElement>('[data-test-id="opt-4"]')!;

    mockRect(trigger, { top: 16, left: 100, width: 200, height: 32 });
    mockRect(lbEl, { top: 0, left: 0, width: 200, height: 160 });
    mockRect(opt4, { top: 120, left: 0, width: 200, height: 40 });

    lb.reference.set(trigger);
    lb.selectedOption.set(opt4);
    lb.collisionPadding.set(24);
    lb.open.set(true);
    await flushPositioning(fixture);

    // Desired Y is very negative → clamps to padding=24.
    expect(lbEl.style.transform).toMatch(/translate\(100px, 24px\)/);
    // available = 800 - 48 = 752.
    expect(lbEl.style.getPropertyValue('--for-select-content-available-height')).toBe('752px');
  });

  it('does not write a transform until both open and reference are set', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    setViewportHeight(800);
    const fixture = TestBed.createComponent(Host);
    await flushPositioning(fixture);

    const lb = fixture.componentInstance.lb();
    const lbEl = document.querySelector<HTMLElement>('item-aligned-listbox')!;
    const trigger = fixture.componentInstance.anchor().nativeElement;

    expect(lbEl.style.transform).toBe('');

    lb.reference.set(trigger);
    await flushPositioning(fixture);
    // Still closed — no positioning runs.
    expect(lbEl.style.transform).toBe('');

    lb.open.set(true);
    await flushPositioning(fixture);
    expect(lbEl.style.transform).toMatch(/translate\(/);
  });
});
