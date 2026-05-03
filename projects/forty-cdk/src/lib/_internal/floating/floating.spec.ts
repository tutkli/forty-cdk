import {
  Component,
  ElementRef,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { injectFloating } from './floating';

@Component({
  template: `
    <button #anchor type="button">Anchor</button>
    <div id="floating">
      Content
      <span #arrow></span>
    </div>
  `,
})
class FloatingHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly arrowEl = viewChild<ElementRef<HTMLElement>>('arrow');

  readonly isOpen = signal(false);
  readonly placement = signal<'top' | 'bottom' | 'left' | 'right'>('top');
  readonly offset = signal(8);
  readonly useArrow = signal(false);

  readonly reference = signal<HTMLElement | null>(null);
  readonly arrow = signal<HTMLElement | null>(null);

  constructor() {
    // Defer reference / arrow population to after view init via signal updates
    // outside of the host's constructor. Tests will trigger this manually.
  }

  attachReference(): void {
    this.reference.set(this.anchor().nativeElement);
    if (this.useArrow()) {
      this.arrow.set(this.arrowEl()?.nativeElement ?? null);
    }
  }
}

@Component({
  selector: 'floating-bubble',
  template: '<ng-content />',
})
class FloatingBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly placement = signal<'top' | 'bottom' | 'left' | 'right'>('top');
  readonly offset = signal(8);
  readonly arrow = signal<HTMLElement | null>(null);
  readonly portal = true;

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      placement: this.placement,
      offset: this.offset,
      arrow: this.arrow,
      portal: this.portal,
    });
  }
}

// Separate fixture exercising the new `side` + `align` + collision API so
// the legacy bubble above stays a clean back-compat regression target.
@Component({
  selector: 'modern-bubble',
  template: '<ng-content />',
})
class ModernBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('bottom');
  readonly align = signal<'start' | 'center' | 'end'>('center');
  readonly sideOffset = signal(8);
  readonly alignOffset = signal(0);
  readonly avoidCollisions = signal(true);
  readonly hideWhenDetached = signal(false);

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      side: this.side,
      align: this.align,
      sideOffset: this.sideOffset,
      alignOffset: this.alignOffset,
      avoidCollisions: this.avoidCollisions,
      hideWhenDetached: this.hideWhenDetached,
      portal: false,
    });
  }
}

@Component({
  imports: [ModernBubble],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <modern-bubble #bubble>Content</modern-bubble>
    </div>
  `,
})
class ModernBubbleHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly bubble = viewChild.required<ModernBubble>('bubble');
}

@Component({
  imports: [FloatingBubble],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <floating-bubble #bubble>
        Content
        <span #arrow></span>
      </floating-bubble>
    </div>
  `,
})
class BubbleHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly bubble = viewChild.required<FloatingBubble>('bubble');
  readonly arrowEl = viewChild.required<ElementRef<HTMLElement>>('arrow');
}

@Component({
  selector: 'inplace-bubble',
  template: '<ng-content />',
})
class InPlaceBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly placement = signal<'top'>('top');
  readonly offset = signal(8);

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      placement: this.placement,
      offset: this.offset,
      portal: false,
    });
  }
}

@Component({
  imports: [InPlaceBubble],
  template: `
    <div id="parent">
      <inplace-bubble #b>x</inplace-bubble>
    </div>
  `,
})
class InPlaceHost {
  readonly bubble = viewChild.required<InPlaceBubble>('b');
}

async function flushPositioning<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

describe('injectFloating', () => {
  beforeAll(() => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      } as unknown as typeof ResizeObserver;
    }
    if (typeof globalThis.IntersectionObserver === 'undefined') {
      globalThis.IntersectionObserver = class {
        readonly root = null;
        readonly rootMargin = '';
        readonly thresholds: readonly number[] = [];
        constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
      } as unknown as typeof IntersectionObserver;
    }
  });

  afterEach(() => {
    document
      .querySelectorAll('floating-bubble, inplace-bubble, modern-bubble')
      .forEach((n) => n.remove());
  });

  describe('portal', () => {
    it('moves the floating element to document.body once mounted', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);

      const container = fixture.nativeElement.querySelector('#container');
      const bubbleEl = document.querySelector('floating-bubble')!;
      expect(bubbleEl.parentElement).toBe(document.body);
      expect(container.contains(bubbleEl)).toBe(false);
    });

    it('removes the portaled element on destroy', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);

      expect(document.querySelectorAll('floating-bubble')).toHaveLength(1);
      fixture.destroy();
      expect(document.querySelectorAll('floating-bubble')).toHaveLength(0);
    });

    it('keeps the element in place when portal: false', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(InPlaceHost);
      await flushPositioning(fixture);

      const parent = fixture.nativeElement.querySelector('#parent');
      const bubble = parent.querySelector('inplace-bubble');
      expect(bubble).toBeTruthy();
      expect(bubble.parentElement).toBe(parent);
    });
  });

  describe('baseline styles', () => {
    it('applies position:fixed and zero offsets after mount', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);

      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;
      expect(bubbleEl.style.position).toBe('fixed');
      expect(bubbleEl.style.left).toBe('0px');
      expect(bubbleEl.style.top).toBe('0px');
    });
  });

  describe('reactive positioning', () => {
    it('writes transform and data-placement only when open AND reference are set', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      // open=false → no transform yet.
      expect(bubbleEl.style.transform).toBe('');

      // Reference set but still closed.
      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      await flushPositioning(fixture);
      expect(bubbleEl.style.transform).toBe('');

      // Open it.
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubbleEl.style.transform).toMatch(/translate\(-?\d+px, -?\d+px\)/);
      expect(bubbleEl.dataset['placement']).toBe('top');
    });

    it('reacts to placement changes by re-running computePosition', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubbleEl.dataset['placement']).toBe('top');

      bubble.placement.set('bottom');
      await flushPositioning(fixture);
      expect(bubbleEl.dataset['placement']).toBe('bottom');
    });

    it('clears nothing on close but stops further updates', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      const firstPlacement = bubbleEl.dataset['placement'];
      expect(firstPlacement).toBe('top');

      bubble.open.set(false);
      bubble.placement.set('bottom');
      await flushPositioning(fixture);
      // Placement string preserved (no further computePosition while closed).
      expect(bubbleEl.dataset['placement']).toBe('top');
    });
  });

  describe('arrow', () => {
    it('positions the arrow absolutely with side-aware offset when provided', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const arrowEl = fixture.componentInstance.arrowEl().nativeElement;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.arrow.set(arrowEl);
      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(arrowEl.style.position).toBe('absolute');
      expect(arrowEl.dataset['placement']).toBeTruthy();
      expect(arrowEl.dataset['side']).toBeTruthy();
      // top placement → opposite is 'bottom' → bottom: -4px should be set.
      expect(arrowEl.style.bottom).toBe('-4px');
    });
  });

  describe('data-side / data-align', () => {
    it('reflects data-side and data-align on the host (legacy placement input)', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);

      // placement='top' (no align suffix) → side='top', align='center'.
      expect(bubbleEl.dataset['side']).toBe('top');
      expect(bubbleEl.dataset['align']).toBe('center');
    });

    it('builds placement from side + align when both are provided', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ModernBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('modern-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.side.set('right');
      bubble.align.set('end');
      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(bubbleEl.dataset['placement']).toBe('right-end');
      expect(bubbleEl.dataset['side']).toBe('right');
      expect(bubbleEl.dataset['align']).toBe('end');
    });

    it('treats align="center" as no suffix in placement', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ModernBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('modern-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.side.set('left');
      bubble.align.set('center');
      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(bubbleEl.dataset['placement']).toBe('left');
      expect(bubbleEl.dataset['side']).toBe('left');
      expect(bubbleEl.dataset['align']).toBe('center');
    });
  });

  describe('CSS variables', () => {
    it('writes --for-anchor-width / --for-anchor-height from the reference rect', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);

      // jsdom returns 0 from getBoundingClientRect — the var must still be set
      // with an explicit "Npx" value so consumers can rely on it being present.
      expect(bubbleEl.style.getPropertyValue('--for-anchor-width')).toMatch(/^-?\d+px$/);
      expect(bubbleEl.style.getPropertyValue('--for-anchor-height')).toMatch(/^-?\d+px$/);
    });

    it('writes --for-available-width / --for-available-height from the size middleware', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(bubbleEl.style.getPropertyValue('--for-available-width')).toMatch(/^\d+px$/);
      expect(bubbleEl.style.getPropertyValue('--for-available-height')).toMatch(/^\d+px$/);
    });

    it('writes --for-content-transform-origin matching the resolved side/align', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ModernBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('modern-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.side.set('bottom');
      bubble.align.set('start');
      bubble.open.set(true);
      await flushPositioning(fixture);

      // bottom + align:start → content scales out from the trigger's
      // bottom-left corner → origin is the floating element's "left top".
      expect(bubbleEl.style.getPropertyValue('--for-content-transform-origin')).toBe('left top');

      bubble.side.set('right');
      bubble.align.set('end');
      await flushPositioning(fixture);

      // right + align:end → origin is left bottom of the floating element.
      expect(bubbleEl.style.getPropertyValue('--for-content-transform-origin')).toBe('left bottom');
    });
  });

  describe('avoidCollisions', () => {
    it('still resolves a placement when avoidCollisions is false', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ModernBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('modern-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.side.set('top');
      bubble.align.set('center');
      bubble.avoidCollisions.set(false);
      bubble.open.set(true);
      await flushPositioning(fixture);

      // Without flip/shift the requested placement is honoured verbatim.
      expect(bubbleEl.dataset['side']).toBe('top');
      expect(bubbleEl.dataset['align']).toBe('center');
      expect(bubbleEl.style.transform).toMatch(/translate\(-?\d+px, -?\d+px\)/);
    });
  });

  describe('hideWhenDetached', () => {
    it('does not set data-detached when the option is off', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ModernBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('modern-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.hideWhenDetached.set(false);
      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(bubbleEl.dataset['detached']).toBeUndefined();
    });
  });
});
