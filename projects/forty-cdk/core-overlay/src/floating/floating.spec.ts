import {
  Component,
  computed,
  type ElementRef,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComputePositionReturn, Placement } from '@floating-ui/dom';

import { flushPositioning, installObserverPolyfills } from '../../../src/test-utils';
import { buildFlipOptions, injectFloating } from './floating';
import { runPositioning } from './run-positioning';

@Component({
  selector: 'floating-bubble',
  template: '<ng-content />',
})
class FloatingBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly side = signal<'top' | 'bottom' | 'left' | 'right'>('top');
  readonly sideOffset = signal(8);
  readonly arrow = signal<HTMLElement | null>(null);
  readonly portal = true;

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      side: this.side,
      sideOffset: this.sideOffset,
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

// Fixture that counts how often the positioning effect reads `sideOffset`.
// The counter lives on the host (spec-owned state, not a directive internal),
// so a spec can assert the effect did NOT re-run on an offset change while
// the overlay is closed.
@Component({
  selector: 'tracking-bubble',
  template: '<ng-content />',
})
class TrackingBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('bottom');
  readonly rawSideOffset = signal(8);

  sideOffsetReads = 0;
  readonly sideOffset = computed(() => {
    this.sideOffsetReads++;
    return this.rawSideOffset();
  });

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      side: this.side,
      sideOffset: this.sideOffset,
      portal: false,
    });
  }
}

@Component({
  imports: [TrackingBubble],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <tracking-bubble #bubble>Content</tracking-bubble>
    </div>
  `,
})
class TrackingBubbleHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly bubble = viewChild.required<TrackingBubble>('bubble');
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
  readonly side = signal<'top'>('top');
  readonly sideOffset = signal(8);

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      side: this.side,
      sideOffset: this.sideOffset,
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

@Component({
  selector: 'no-clip-bubble',
  template: '<ng-content />',
})
class NoClipBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly clipUntilPositioned = signal(false);

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      clipUntilPositioned: this.clipUntilPositioned,
      portal: true,
    });
  }
}

@Component({
  imports: [NoClipBubble],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <no-clip-bubble #bubble>Content</no-clip-bubble>
    </div>
  `,
})
class NoClipBubbleHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly bubble = viewChild.required<NoClipBubble>('bubble');
}

@Component({
  selector: 'first-position-bubble',
  template: '<ng-content />',
})
class FirstPositionBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly side = signal<'top' | 'bottom'>('top');
  firstPositionCount = 0;

  constructor() {
    injectFloating({
      reference: this.reference,
      open: this.open,
      side: this.side,
      portal: true,
      onFirstPosition: () => {
        this.firstPositionCount++;
      },
    });
  }
}

@Component({
  imports: [FirstPositionBubble],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <first-position-bubble #bubble>Content</first-position-bubble>
    </div>
  `,
})
class FirstPositionBubbleHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly bubble = viewChild.required<FirstPositionBubble>('bubble');
}

@Component({
  selector: 'recorder-bubble',
  template: '<ng-content />',
})
class RecorderBubble {
  readonly reference = signal<HTMLElement | null>(null);
  readonly open = signal(false);
  readonly requestedPlacement = signal<Placement>('top');

  readonly appliedPlacements: Placement[] = [];
  firstPositionCount = 0;
  firstPositionSawPlacement: Placement | null = null;

  constructor() {
    runPositioning({
      reference: this.reference,
      open: this.open,
      portal: false,
      onFirstPosition: () => {
        this.firstPositionCount++;
        this.firstPositionSawPlacement =
          this.appliedPlacements[this.appliedPlacements.length - 1] ?? null;
      },
      computeAndApply: () => {
        const placement = this.requestedPlacement();
        return {
          placement,
          middleware: [],
          apply: (result: ComputePositionReturn) => {
            this.appliedPlacements.push(result.placement);
          },
          reset: () => {},
        };
      },
    });
  }
}

@Component({
  imports: [RecorderBubble],
  template: `
    <div id="container">
      <button #anchor type="button">Anchor</button>
      <recorder-bubble #bubble>Content</recorder-bubble>
    </div>
  `,
})
class RecorderBubbleHost {
  readonly anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
  readonly bubble = viewChild.required<RecorderBubble>('bubble');
}

describe('injectFloating', () => {
  // floating-ui's autoUpdate uses ResizeObserver / IntersectionObserver — jsdom 28
  // still doesn't ship them. Install no-op polyfills for this spec only; the
  // helper restores `globalThis` in `afterAll` so the stubs can't leak across
  // files when Vitest shares a worker (CI `pool: 'forks'` or `isolate: false`).
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

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

      // open=false → no position yet.
      expect(bubbleEl.style.translate).toBe('');

      // Reference set but still closed.
      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      await flushPositioning(fixture);
      expect(bubbleEl.style.translate).toBe('');

      // Open it. Position is written to the `translate` property (NOT
      // `transform`, which stays free for consumer animations).
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubbleEl.style.translate).toMatch(/^-?\d+px -?\d+px$/);
      expect(bubbleEl.style.transform).toBe('');
      expect(bubbleEl.dataset['placement']).toBe('top');
    });

    it('reacts to side changes by re-running computePosition', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubbleEl.dataset['placement']).toBe('top');

      bubble.side.set('bottom');
      await flushPositioning(fixture);
      expect(bubbleEl.dataset['placement']).toBe('bottom');
    });

    it('clears the transient styles, CSS vars, and data-* attrs on close — except the resolved-placement outputs (translate, transform-origin, data-side/align/placement) retained for animate.leave', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const arrowEl = fixture.componentInstance.arrowEl().nativeElement;
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.arrow.set(arrowEl);
      bubble.open.set(true);
      await flushPositioning(fixture);

      // Sanity: helper wrote everything we expect on open.
      expect(bubbleEl.dataset['placement']).toBe('top');
      expect(bubbleEl.dataset['side']).toBe('top');
      expect(bubbleEl.dataset['align']).toBe('center');
      expect(bubbleEl.style.translate).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-width')).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-height')).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-width')).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-height')).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-content-transform-origin')).not.toBe(
        '',
      );
      expect(arrowEl.style.position).toBe('absolute');
      expect(arrowEl.dataset['side']).toBe('top');

      bubble.open.set(false);
      await flushPositioning(fixture);

      // Transient outputs are wiped; the resolved-placement set (translate, transform-origin, data-side/align/placement) is retained for animate.leave.
      expect(bubbleEl.dataset['placement']).toBe('top');
      expect(bubbleEl.dataset['side']).toBe('top');
      expect(bubbleEl.dataset['align']).toBe('center');
      expect(bubbleEl.dataset['occluded']).toBeUndefined();
      expect(bubbleEl.dataset['detached']).toBeUndefined();
      expect(bubbleEl.style.translate).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-content-transform-origin')).not.toBe(
        '',
      );
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-width')).toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-height')).toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-width')).toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-height')).toBe('');

      // Arrow is wiped too.
      expect(arrowEl.style.position).toBe('');
      expect(arrowEl.style.left).toBe('');
      expect(arrowEl.style.top).toBe('');
      expect(arrowEl.style.right).toBe('');
      expect(arrowEl.style.bottom).toBe('');
      expect(arrowEl.dataset['placement']).toBeUndefined();
      expect(arrowEl.dataset['side']).toBeUndefined();
    });

    it('survives a computePosition rejection without leaving the DOM half-written', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      // Track unhandled rejections — the .catch in injectFloating must
      // keep these from bubbling.
      const unhandled: PromiseRejectionEvent[] = [];
      const onUnhandled = (event: PromiseRejectionEvent): void => {
        unhandled.push(event);
        event.preventDefault();
      };
      window.addEventListener('unhandledrejection', onUnhandled);

      try {
        // Force a rejection. A reference whose getBoundingClientRect
        // throws mirrors the shape that virtualization hits when the
        // reference detaches mid-autoUpdate.
        const exploding = {
          getBoundingClientRect: (): DOMRect => {
            throw new Error('reference detached');
          },
          contextElement: undefined,
        };
        bubble.reference.set(exploding as unknown as HTMLElement);
        bubble.open.set(true);
        await flushPositioning(fixture);

        expect(bubbleEl.style.translate).toBe('');
        expect(bubbleEl.dataset['placement']).toBeUndefined();
        expect(unhandled).toHaveLength(0);
      } finally {
        window.removeEventListener('unhandledrejection', onUnhandled);
      }
    });
  });

  describe('reactivity while closed', () => {
    it('does not re-run positioning on offset/side changes while closed', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TrackingBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();

      // Closed: the effect early-returns after reading open/reference and
      // never reaches the sideOffset read.
      const readsWhileClosed = bubble.sideOffsetReads;
      bubble.rawSideOffset.set(16);
      bubble.side.set('top');
      await flushPositioning(fixture);
      expect(bubble.sideOffsetReads).toBe(readsWhileClosed);

      // Open: the effect now reads sideOffset (tracks the rest of the config).
      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubble.sideOffsetReads).toBeGreaterThan(readsWhileClosed);

      // Open: a further offset change re-runs the effect and re-reads it.
      const readsWhileOpen = bubble.sideOffsetReads;
      bubble.rawSideOffset.set(24);
      await flushPositioning(fixture);
      expect(bubble.sideOffsetReads).toBeGreaterThan(readsWhileOpen);
    });
  });

  describe('reposition anti-flash baseline', () => {
    it('re-arms clip-path on a config change while open before the new position resolves', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      // First position resolved → baseline dropped, surface painted.
      expect(bubbleEl.style.clipPath).toBe('');
      expect(bubbleEl.style.translate).not.toBe('');

      // A side change while open re-runs the effect: onCleanup clears the
      // styles, then the effect synchronously re-arms the clip-path baseline
      // so the surface stays hidden at the retained stale position until
      // the async computePosition resolves. Synchronous detectChanges flushes
      // the effect without letting the position promise resolve.
      bubble.side.set('bottom');
      // @sanctioned-sync-render(clip-path-baseline): the re-armed baseline only
      // exists between the effect's re-run and the new position resolving.
      fixture.detectChanges();
      expect(bubbleEl.style.clipPath).toBe('inset(50%)');
      expect(bubbleEl.style.translate).not.toBe('');

      // Once the new position resolves the baseline drops again.
      await flushPositioning(fixture);
      expect(bubbleEl.style.clipPath).toBe('');
      expect(bubbleEl.dataset['placement']).toBe('bottom');
    });
  });

  describe('clip-path baseline opt-out', () => {
    it('arms the clip-path baseline by default until the first position resolves', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      // @sanctioned-sync-render(clip-path-baseline): the armed baseline is what
      // the surface wears before its first position resolves.
      fixture.detectChanges();
      expect(bubbleEl.style.clipPath).toBe('inset(50%)');

      await flushPositioning(fixture);
      expect(bubbleEl.style.clipPath).toBe('');
    });

    it('never arms the clip-path baseline when clipUntilPositioned() is false', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(NoClipBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('no-clip-bubble')!;

      expect(bubbleEl.style.clipPath).toBe('');

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      // @sanctioned-sync-render(clip-path-baseline): the opt-out's claim is that
      // no baseline is armed in the window before the first position resolves.
      fixture.detectChanges();
      expect(bubbleEl.style.clipPath).toBe('');

      await flushPositioning(fixture);
      expect(bubbleEl.style.clipPath).toBe('');
      expect(bubbleEl.dataset['placement']).toBe('bottom');
    });
  });

  describe('arrow', () => {
    it('positions the arrow absolutely with the --for-floating-arrow-offset CSS var on the opposite side', async () => {
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
      // FloatingBubble defaults to side='top' → arrow's data-placement /
      // data-side both store the resolved side.
      expect(arrowEl.dataset['placement']).toBe('top');
      expect(arrowEl.dataset['side']).toBe('top');
      // top placement → opposite is 'bottom' → bottom is wired to the
      // consumer-controlled CSS var, never the legacy `-4px` literal.
      expect(arrowEl.style.bottom).toBe('var(--for-floating-arrow-offset, 0px)');
      expect(arrowEl.style.bottom).not.toBe('-4px');
    });
  });

  describe('data-side / data-align', () => {
    it('reflects data-side and data-align on the host with default align', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);

      // side='top' with default align → align='center'.
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
    // Both properties below resolve to `0px` in jsdom whatever the middleware
    // computed, so the two cases here claim publication only — which names this
    // positioner writes, and that it writes them no earlier than the first
    // resolved position. The values go to `combobox.e2e.ts` /
    // `context-menu.e2e.ts` (anchor box) and `popover.e2e.ts` (size budget);
    // `flushPositioning`'s JSDoc states the split. #1739.
    it('publishes the anchor-box property names once a position resolves, and not before', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      // Reference set, still closed: the full drain hands the positioner every
      // hop it would get on a real open, and it must still write nothing.
      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      await flushPositioning(fixture);
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-width')).toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-height')).toBe('');

      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-width')).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-anchor-height')).not.toBe('');
    });

    it('publishes both axes of the size budget, unlike the item-aligned positioner', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(BubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('floating-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      await flushPositioning(fixture);
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-width')).toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-height')).toBe('');

      bubble.open.set(true);
      await flushPositioning(fixture);

      // The cross-axis budget is the half `item-aligned` deliberately never
      // writes — its own spec asserts that absence, so this is the other side
      // of that guard rather than a symmetry check.
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-width')).not.toBe('');
      expect(bubbleEl.style.getPropertyValue('--for-floating-available-height')).not.toBe('');
    });

    it('writes --for-floating-content-transform-origin matching the resolved side/align', async () => {
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
      expect(bubbleEl.style.getPropertyValue('--for-floating-content-transform-origin')).toBe(
        'left top',
      );

      bubble.side.set('right');
      bubble.align.set('end');
      await flushPositioning(fixture);

      // right + align:end → origin is left bottom of the floating element.
      expect(bubbleEl.style.getPropertyValue('--for-floating-content-transform-origin')).toBe(
        'left bottom',
      );
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
      expect(bubbleEl.style.translate).toMatch(/^-?\d+px -?\d+px$/);
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

  describe('onFirstPosition', () => {
    it('does not fire while the surface stays closed', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(FirstPositionBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      await flushPositioning(fixture);

      expect(bubble.firstPositionCount).toBe(0);
    });

    it('fires exactly once after the first position resolves on open', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(FirstPositionBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();
      const bubbleEl = document.querySelector<HTMLElement>('first-position-bubble')!;

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);

      expect(bubbleEl.style.translate).not.toBe('');
      expect(bubble.firstPositionCount).toBe(1);

      await flushPositioning(fixture);
      expect(bubble.firstPositionCount).toBe(1);
    });

    it('does not re-fire on a positioner-config change while open (per-open, not per-run)', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(FirstPositionBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubble.firstPositionCount).toBe(1);

      bubble.side.set('bottom');
      await flushPositioning(fixture);
      expect(bubble.firstPositionCount).toBe(1);
    });

    it('fires again on a fresh open cycle after close and re-open', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(FirstPositionBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubble.firstPositionCount).toBe(1);

      bubble.open.set(false);
      await flushPositioning(fixture);

      bubble.open.set(true);
      await flushPositioning(fixture);
      expect(bubble.firstPositionCount).toBe(2);
    });
  });

  describe('superseded (cancelled) run', () => {
    it('a run superseded by a config change while its position is still pending writes nothing and never fires onFirstPosition', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(RecorderBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      fixture.detectChanges();

      bubble.requestedPlacement.set('bottom');
      fixture.detectChanges();

      await flushPositioning(fixture);

      expect(bubble.appliedPlacements).toEqual(['bottom']);
      expect(bubble.firstPositionCount).toBe(1);
      expect(bubble.firstPositionSawPlacement).toBe('bottom');
    });

    it('a run torn down by a close while its position is still pending writes nothing', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(RecorderBubbleHost);
      await flushPositioning(fixture);
      const bubble = fixture.componentInstance.bubble();

      bubble.reference.set(fixture.componentInstance.anchor().nativeElement);
      bubble.open.set(true);
      fixture.detectChanges();

      bubble.open.set(false);
      fixture.detectChanges();

      await flushPositioning(fixture);

      expect(bubble.appliedPlacements).toEqual([]);
      expect(bubble.firstPositionCount).toBe(0);
    });
  });

  describe('buildFlipOptions', () => {
    it('includes fallbackAxisSideDirection when set to a non-none value', () => {
      const opts = buildFlipOptions({
        padding: 0,
        boundary: null,
        fallbackAxisSideDirection: 'start',
        fallbackPlacements: undefined,
      });

      expect(opts.fallbackAxisSideDirection).toBe('start');
    });

    it('omits fallbackAxisSideDirection when defaulted to "none" (matches floating-ui default)', () => {
      const opts = buildFlipOptions({
        padding: 0,
        boundary: null,
        fallbackAxisSideDirection: 'none',
        fallbackPlacements: undefined,
      });

      expect(opts).not.toHaveProperty('fallbackAxisSideDirection');
    });

    it('includes a copy of fallbackPlacements when a non-empty list is provided', () => {
      const placements = ['bottom', 'top'] as const;
      const opts = buildFlipOptions({
        padding: 0,
        boundary: null,
        fallbackAxisSideDirection: 'none',
        fallbackPlacements: placements,
      });

      expect(opts.fallbackPlacements).toEqual(['bottom', 'top']);
      expect(opts.fallbackPlacements).not.toBe(placements);
    });

    it('omits fallbackPlacements when the list is empty or unset', () => {
      expect(
        buildFlipOptions({
          padding: 0,
          boundary: null,
          fallbackAxisSideDirection: 'none',
          fallbackPlacements: [],
        }),
      ).not.toHaveProperty('fallbackPlacements');
      expect(
        buildFlipOptions({
          padding: 0,
          boundary: null,
          fallbackAxisSideDirection: 'none',
          fallbackPlacements: undefined,
        }),
      ).not.toHaveProperty('fallbackPlacements');
    });
  });
});
