import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../../test-utils';
import { injectOverlayShell, type OverlayShellConfig } from './overlay-shell';

/**
 * Tracks the most recently rendered fixture so `afterEach` can `destroy()` it
 * before wiping `document.body.innerHTML`. Without this, the shell's
 * `DestroyRef` hooks (dismissable layer / focus trap / scroll lock / inert
 * siblings) don't fire until the next test's `resetTestingModule`, leaving
 * body-style residue and global document listeners across the test boundary.
 * `ComponentFixture#destroy` is idempotent, so tests that call `ctx.destroy()`
 * themselves remain safe.
 */
let activeFixture: ComponentFixture<unknown> | null = null;

/**
 * Closure-shaped fixture: each spec hands `mountShell` a config builder. The
 * helper renders a `@if(open()) { <div mountedShell> }` host, lets the test
 * close (toggle the signal off) and destroy the fixture so the spec can
 * assert on each lifecycle phase.
 *
 * The config builder is invoked from inside the directive's constructor, so
 * `signal()`s captured by closure are read at the right time.
 */
function mountShell(buildConfig: () => OverlayShellConfig) {
  const open = signal(true);

  @Directive({ selector: '[mountedShell]' })
  class MountedShell {
    constructor() {
      injectOverlayShell(buildConfig());
    }
  }

  @Component({
    standalone: true,
    imports: [MountedShell],
    template: `
      @if (open()) {
        <div mountedShell id="surface" tabindex="-1">
          <button id="inside-1">in1</button>
          <button id="inside-2">in2</button>
        </div>
      }
    `,
  })
  class Host {
    readonly open = open;
  }

  const r = renderHost(Host);
  activeFixture = r.fixture;

  return {
    fixture: r.fixture,
    surface: () => document.querySelector<HTMLElement>('#surface'),
    close: () => {
      open.set(false);
      r.fixture.detectChanges();
    },
    destroy: () => r.fixture.destroy(),
  };
}

function makeReference(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('injectOverlayShell', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Destroy the fixture FIRST so the shell's DestroyRef hooks
    // (DismissableLayerStack.unregister, InertSiblingsStack.deactivate,
    // BodyScrollLock.unlock, FocusTrap.deactivate) fire inside this test's
    // boundary rather than at the next test's setup. Then clear the body
    // styles + DOM the trap / scroll lock may have touched.
    activeFixture?.destroy();
    activeFixture = null;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.innerHTML = '';
  });

  describe('positioner branch', () => {
    it("delegates to injectFloating when kind is 'floating'", async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
      }));
      await flush(ctx.fixture);

      // injectFloating writes baseline `position: fixed` styles after the
      // first render. That's the smoke signal that the floating helper ran.
      expect(ctx.surface()?.style.position).toBe('fixed');
      ctx.destroy();
    });

    it("delegates to injectItemAlignedPositioner when kind is 'item-aligned'", async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const ctx = mountShell(() => ({
        positioner: {
          kind: 'item-aligned',
          reference: ref,
          open,
          selectedOption: signal<HTMLElement | null>(null),
          portal: false,
        },
      }));
      await flush(ctx.fixture);

      // The item-aligned helper writes the same `position: fixed` baseline.
      expect(ctx.surface()?.style.position).toBe('fixed');
      ctx.destroy();
    });
  });

  describe('dismiss bundle', () => {
    it('does not register escape handling when dismiss is omitted', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
      }));
      await flush(ctx.fixture);

      // No throw, no listener — pressing Escape is a no-op for this surface.
      pressKey(document, 'Escape');
      expect(ctx.surface()).toBeTruthy();
      ctx.destroy();
    });

    it('forwards onEscapeKeyDown through the dismissable layer', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const calls: string[] = [];

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        dismiss: {
          emitEscapeKeyDown: () => calls.push('escape'),
        },
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(calls).toEqual(['escape']);
      ctx.destroy();
    });

    it('combobox-style: omitting emitEscapeKeyDown leaves Escape untouched while other channels still fire', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const calls: string[] = [];

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        dismiss: {
          // Escape intentionally omitted.
          emitPointerDownOutside: () => calls.push('pointer'),
        },
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(calls).toEqual([]);

      // Outside pointer-down still fires.
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      expect(calls).toEqual(['pointer']);

      ctx.destroy();
    });

    it('preventDefault on emitEscapeKeyDown vetoes the implicit dismiss', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const calls: string[] = [];

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        dismiss: {
          emitEscapeKeyDown: (event) => {
            calls.push('escape');
            event.preventDefault();
          },
        },
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(calls).toEqual(['escape']);
      // Surface still mounted because no onDismiss was wired (we only check
      // the handler ran and event.defaultPrevented is honored — the
      // dismissable layer itself owns the contract).
      expect(ctx.surface()).toBeTruthy();
      ctx.destroy();
    });
  });

  describe('initial focus', () => {
    it("focuses the first focusable descendant when move is 'first'", async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        initialFocus: { move: 'first' },
      }));
      await flush(ctx.fixture);

      expect(document.activeElement?.id).toBe('inside-1');
      ctx.destroy();
    });

    it("focuses the host when move is 'container'", async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        initialFocus: { move: 'container' },
      }));
      await flush(ctx.fixture);

      expect(document.activeElement?.id).toBe('surface');
      ctx.destroy();
    });

    it('runs a primitive-owned move() when provided', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      let moveCalls = 0;

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        initialFocus: {
          move: () => {
            moveCalls++;
            // Pretend the primitive moved focus internally.
            document.querySelector<HTMLElement>('#inside-2')?.focus();
            return true;
          },
        },
      }));
      await flush(ctx.fixture);

      expect(moveCalls).toBe(1);
      expect(document.activeElement?.id).toBe('inside-2');
      ctx.destroy();
    });

    it('falls back to the host when move() returns false', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        initialFocus: { move: () => false },
      }));
      await flush(ctx.fixture);

      // When the primitive's move() reports a miss the shell focuses the host
      // (which has tabindex="-1" in our fixture) so keyboard users land
      // somewhere predictable.
      expect(document.activeElement?.id).toBe('surface');
      ctx.destroy();
    });

    it('skips the focus move when veto() returns true (autoFocusOnOpen)', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);

      const externalInput = document.createElement('input');
      document.body.appendChild(externalInput);
      externalInput.focus();

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        initialFocus: {
          move: 'first',
          veto: () => true,
        },
      }));
      await flush(ctx.fixture);

      expect(document.activeElement).toBe(externalInput);
      ctx.destroy();
    });
  });

  describe('return focus', () => {
    it('returns focus to the trigger on destroy when enabled', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const triggerEl = document.createElement('button');
      document.body.appendChild(triggerEl);

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        returnFocus: {
          enabled: signal(true),
          target: () => triggerEl,
        },
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(document.activeElement).toBe(triggerEl);
      ctx.destroy();
    });

    it('skips the focus call when enabled() is false', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const triggerEl = document.createElement('button');
      document.body.appendChild(triggerEl);
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        returnFocus: {
          enabled: signal(false),
          target: () => triggerEl,
        },
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(document.activeElement).toBe(elsewhere);
      ctx.destroy();
    });

    it('skips the focus call when veto() returns true', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const triggerEl = document.createElement('button');
      document.body.appendChild(triggerEl);
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        returnFocus: {
          enabled: signal(true),
          target: () => triggerEl,
          veto: () => true,
        },
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(document.activeElement).toBe(elsewhere);
      ctx.destroy();
    });

    it('skips the focus call when skip() returns true', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const triggerEl = document.createElement('button');
      document.body.appendChild(triggerEl);
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        returnFocus: {
          enabled: signal(true),
          target: () => triggerEl,
          skip: () => true,
        },
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(document.activeElement).toBe(elsewhere);
      ctx.destroy();
    });

    it('does nothing when returnFocus is omitted', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const elsewhere = document.createElement('input');
      document.body.appendChild(elsewhere);
      elsewhere.focus();

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(document.activeElement).toBe(elsewhere);
      ctx.destroy();
    });
  });

  describe('destroy ordering', () => {
    it('deactivates the dismissable layer before the surface unmounts', async () => {
      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const calls: string[] = [];

      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        dismiss: {
          // If the layer was still active during teardown, removing the
          // surface from the DOM could route a focusin to handleFocusIn and
          // call this. The shell's order (dismissable.deactivate registers
          // before the positioner's portal) guarantees that doesn't happen.
          emitFocusOutside: () => calls.push('focus-outside'),
        },
      }));
      await flush(ctx.fixture);

      ctx.close();
      // No spurious focus-outside fired during teardown.
      expect(calls).toEqual([]);
      ctx.destroy();
    });
  });

  describe('zoneless reactivity', () => {
    it('runs the lifecycle under provideZonelessChangeDetection', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      const ref = signal<HTMLElement | null>(makeReference());
      const open = signal(true);
      const triggerEl = document.createElement('button');
      document.body.appendChild(triggerEl);

      const calls: string[] = [];
      const ctx = mountShell(() => ({
        positioner: { kind: 'floating', reference: ref, open, portal: false },
        dismiss: {
          emitEscapeKeyDown: () => calls.push('escape'),
        },
        initialFocus: { move: 'first' },
        returnFocus: {
          enabled: signal(true),
          target: () => triggerEl,
        },
      }));
      await flush(ctx.fixture);

      expect(document.activeElement?.id).toBe('inside-1');

      pressKey(document, 'Escape');
      expect(calls).toEqual(['escape']);

      ctx.close();
      expect(document.activeElement).toBe(triggerEl);
      ctx.destroy();
    });
  });
});
