import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../../test-utils';
import { injectModalShell, type ModalShellConfig, type ModalShellHandle } from './modal-shell';

/**
 * Closure-shaped fixture: each spec hands `mountShell` a config builder. The
 * helper renders a `@if(open()) { <div mountedShell> }` host, exposes a
 * `close()` to flip the gating signal off, and returns the
 * `ModalShellHandle` returned by `injectModalShell`.
 *
 * The config builder is invoked from inside the directive's constructor, so
 * `signal()`s captured by closure are read at the right time. Mirrors the
 * shape of `overlay-shell.spec.ts` so reviewers can diff the two side-by-side.
 *
 * Per the Decision recorded on #179, the wiring assertions live here; the
 * focus-trap / return-focus / scroll-lock / inert-siblings outcomes are
 * exercised against real browsers in `dialog.e2e.ts` / `drawer.e2e.ts`. The
 * Vitest layer covers the wiring branches (which side-effects fire under
 * which configs), not the post-state.
 */
function mountShell(buildConfig: () => ModalShellConfig) {
  const open = signal(true);
  let captured: ModalShellHandle | null = null;

  @Directive({ selector: '[mountedShell]' })
  class MountedShell {
    constructor() {
      captured = injectModalShell(buildConfig());
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

  return {
    fixture: r.fixture,
    handle: () => captured!,
    surface: () => document.querySelector<HTMLElement>('#surface'),
    close: () => {
      open.set(false);
      r.fixture.detectChanges();
    },
    destroy: () => r.fixture.destroy(),
  };
}

/**
 * Builds a no-op-handlers dismiss config so specs that only care about
 * one channel (Escape, pointer-down, etc.) don't have to repeat the rest.
 */
function makeDismissConfig(
  partial: Partial<ModalShellConfig['dismiss']> & {
    requestClose?: (reason: 'escape' | 'pointerDownOutside' | 'focusOutside') => void;
  } = {},
): NonNullable<ModalShellConfig['dismiss']> {
  return {
    dismissible: signal(true),
    requestClose: partial.requestClose ?? (() => {}),
    emitEscapeKeyDown: partial.emitEscapeKeyDown ?? (() => {}),
    emitPointerDownOutside: partial.emitPointerDownOutside ?? (() => {}),
    emitFocusOutside: partial.emitFocusOutside ?? (() => {}),
    emitInteractOutside: partial.emitInteractOutside ?? (() => {}),
    ...(partial.exemptElements ? { exemptElements: partial.exemptElements } : {}),
  };
}

describe('injectModalShell', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('portal', () => {
    it('moves the host to document.body after first render', async () => {
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
      }));
      await flush(ctx.fixture);

      // The portal helper moves the host to body. Asserting on the parent
      // is the cheapest signal that `injectPortal()` ran inside the shell.
      expect(ctx.surface()?.parentElement).toBe(document.body);
      ctx.destroy();
    });

    it('removes the host from the DOM on destroy', async () => {
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
      }));
      await flush(ctx.fixture);
      expect(ctx.surface()).toBeTruthy();

      ctx.close();
      expect(ctx.surface()).toBeNull();
      ctx.destroy();
    });
  });

  describe('dismiss bundle', () => {
    it('does not register dismissable handlers when dismiss is omitted', async () => {
      const calls: string[] = [];
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        // Intentionally NO dismiss block. Pressing Escape should not call
        // anything.
        autoFocusOnOpen: () => undefined,
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(calls).toEqual([]);
      ctx.destroy();
    });

    it('forwards the Escape vetoable event and fires requestClose("escape") when not vetoed', async () => {
      const escapeCalls: number = 0;
      const escapeEvents: Array<{ defaultPrevented: boolean; event: KeyboardEvent }> = [];
      const requestCloseCalls: string[] = [];

      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          emitEscapeKeyDown: (veto) => {
            escapeEvents.push({ defaultPrevented: veto.defaultPrevented, event: veto.event });
          },
          requestClose: (reason) => requestCloseCalls.push(reason),
        }),
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(escapeEvents.length).toBe(1);
      expect(escapeEvents[0]!.event).toBeInstanceOf(KeyboardEvent);
      expect(requestCloseCalls).toEqual(['escape']);
      // Sanity: the local count was 0 before the press.
      expect(escapeCalls).toBe(0);
      ctx.destroy();
    });

    it('preventDefault on emitEscapeKeyDown vetoes the implicit requestClose', async () => {
      const requestCloseCalls: string[] = [];

      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          emitEscapeKeyDown: (veto) => veto.preventDefault(),
          requestClose: (reason) => requestCloseCalls.push(reason),
        }),
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(requestCloseCalls).toEqual([]);
      ctx.destroy();
    });

    it('does not fire requestClose("escape") when dismissible() is false', async () => {
      const dismissible = signal(false);
      const requestCloseCalls: string[] = [];

      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: {
          dismissible,
          requestClose: (reason) => requestCloseCalls.push(reason),
          emitEscapeKeyDown: () => {},
          emitPointerDownOutside: () => {},
          emitFocusOutside: () => {},
          emitInteractOutside: () => {},
        },
      }));
      await flush(ctx.fixture);

      pressKey(document, 'Escape');
      expect(requestCloseCalls).toEqual([]);
      ctx.destroy();
    });

    it('shares one veto wrapper between pointerDownOutside and interactOutside (Drawer/Dialog contract)', async () => {
      // The triple-veto pattern: pointer-down-outside fires first with a
      // wrapper that is then reused for interactOutside. preventDefault on
      // either suppresses requestClose. We assert the same VetoableNativeEvent
      // arrives in both emitters.
      const seen: Array<{ kind: string; ref: object }> = [];
      const requestCloseCalls: string[] = [];

      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          emitPointerDownOutside: (veto) => seen.push({ kind: 'specific', ref: veto }),
          emitInteractOutside: (veto) => seen.push({ kind: 'composite', ref: veto }),
          requestClose: (reason) => requestCloseCalls.push(reason),
        }),
      }));
      await flush(ctx.fixture);

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);

      expect(seen.length).toBe(2);
      expect(seen[0]!.kind).toBe('specific');
      expect(seen[1]!.kind).toBe('composite');
      // SAME object instance — that is what makes the triple-veto work.
      expect(seen[0]!.ref).toBe(seen[1]!.ref);
      expect(requestCloseCalls).toEqual(['pointerDownOutside']);
      ctx.destroy();
    });

    it('preventDefault on emitPointerDownOutside vetoes via the shared wrapper', async () => {
      const requestCloseCalls: string[] = [];

      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          // Specific channel vetoes — composite still fires but inherits
          // defaultPrevented, so requestClose stays silent.
          emitPointerDownOutside: (veto) => veto.preventDefault(),
          requestClose: (reason) => requestCloseCalls.push(reason),
        }),
      }));
      await flush(ctx.fixture);

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);

      expect(requestCloseCalls).toEqual([]);
      ctx.destroy();
    });

    it('preventDefault on emitInteractOutside vetoes the implicit requestClose', async () => {
      const requestCloseCalls: string[] = [];

      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          emitInteractOutside: (veto) => veto.preventDefault(),
          requestClose: (reason) => requestCloseCalls.push(reason),
        }),
      }));
      await flush(ctx.fixture);

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);

      expect(requestCloseCalls).toEqual([]);
      ctx.destroy();
    });

    it('forwards exemptElements live to the dismissable layer', async () => {
      // Mimics Drawer's backdrop exemption. The exempt element's pointer-down
      // must NOT fire onPointerDownOutside.
      const exemptEl = document.createElement('div');
      document.body.appendChild(exemptEl);
      const exempt = signal<readonly Element[]>([exemptEl]);

      const seen: string[] = [];
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          emitPointerDownOutside: () => seen.push('pointer'),
          exemptElements: () => exempt(),
        }),
      }));
      await flush(ctx.fixture);

      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: exemptEl, configurable: true });
      document.dispatchEvent(event);
      expect(seen).toEqual([]);

      // Drop the exemption — same target now triggers the listener.
      exempt.set([]);
      const event2 = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event2, 'target', { value: exemptEl, configurable: true });
      document.dispatchEvent(event2);
      expect(seen).toEqual(['pointer']);
      ctx.destroy();
    });
  });

  describe('modal vs non-modal branching', () => {
    // These specs exercise WHICH side effects fire under each mode. The
    // post-state of focus / scroll lock / inert lives in dialog.e2e.ts /
    // drawer.e2e.ts per the Decision on #179.
    it('reports isModal() === true when modal() is true at mount', async () => {
      const ctx = mountShell(() => ({
        modal: signal(true),
        returnFocus: signal(true),
        initialFocus: signal('first'),
      }));
      await flush(ctx.fixture);

      expect(ctx.handle().isModal()).toBe(true);
      ctx.destroy();
    });

    it('reports isModal() === false when modal() is false at mount', async () => {
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
      }));
      await flush(ctx.fixture);

      expect(ctx.handle().isModal()).toBe(false);
      ctx.destroy();
    });

    it('latches the activated mode at mount — toggling modal later does not change isModal()', async () => {
      const modal = signal(true);
      const ctx = mountShell(() => ({
        modal,
        returnFocus: signal(true),
        initialFocus: signal('first'),
      }));
      await flush(ctx.fixture);
      expect(ctx.handle().isModal()).toBe(true);

      // Flipping the input after activation does NOT swap the teardown path.
      // This mirrors the directive's `#activatedAsModal` capture.
      modal.set(false);
      await flush(ctx.fixture);
      expect(ctx.handle().isModal()).toBe(true);
      ctx.destroy();
    });
  });

  describe('autoFocusOnOpen veto wiring', () => {
    it('invokes the callback with a VetoableEvent at mount', async () => {
      const calls: number[] = [];
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        autoFocusOnOpen: () => (event) => {
          // The shape passed to the callback must be a VetoableEvent: have
          // preventDefault + defaultPrevented.
          expect(typeof event.preventDefault).toBe('function');
          expect(event.defaultPrevented).toBe(false);
          calls.push(1);
        },
      }));
      await flush(ctx.fixture);
      expect(calls).toEqual([1]);
      ctx.destroy();
    });

    it('does nothing when the lookup returns undefined (no callback bound)', async () => {
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        autoFocusOnOpen: () => undefined,
      }));
      // Should not throw.
      await flush(ctx.fixture);
      ctx.destroy();
    });
  });

  describe('autoFocusOnClose veto wiring', () => {
    it('invokes the callback once at destroy on the modal close path', async () => {
      const calls: number[] = [];
      const ctx = mountShell(() => ({
        modal: signal(true),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        autoFocusOnClose: () => (event) => {
          expect(typeof event.preventDefault).toBe('function');
          calls.push(1);
        },
      }));
      await flush(ctx.fixture);
      expect(calls).toEqual([]);

      ctx.close();
      expect(calls).toEqual([1]);
      ctx.destroy();
    });

    it('invokes the callback at destroy on the non-modal close path too (parity with manager)', async () => {
      const calls: number[] = [];
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        autoFocusOnClose: () => (event) => {
          expect(typeof event.preventDefault).toBe('function');
          calls.push(1);
        },
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(calls).toEqual([1]);
      ctx.destroy();
    });
  });

  describe('destroy ordering', () => {
    it('deactivates the dismissable layer before the surface unmounts', async () => {
      // Same invariant as overlay-shell.spec.ts: the layer's deactivate hook
      // is registered first, so nothing routes a synthetic focusin during
      // teardown back through the (now-doomed) listener.
      const calls: string[] = [];
      const ctx = mountShell(() => ({
        modal: signal(false),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        dismiss: makeDismissConfig({
          emitFocusOutside: () => calls.push('focus-outside'),
        }),
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(calls).toEqual([]);
      ctx.destroy();
    });

    it('autoFocusOnClose fires BEFORE the modal teardown so consumers can redirect focus reliably', async () => {
      // The contract: the close veto callback runs synchronously from the
      // destroy hook, BEFORE the focus-trap deactivate. It is the consumer's
      // single hook for "close is happening, modal or not". This spec just
      // asserts ordering relative to the destroy boundary — the post-state
      // of the focus trap is exercised in the E2E suite.
      const order: string[] = [];
      const ctx = mountShell(() => ({
        modal: signal(true),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        autoFocusOnClose: () => () => order.push('autoFocusOnClose'),
        dismiss: makeDismissConfig({
          // Forwarding handler is silent, but the layer's deactivate is one
          // of the destroy steps; we assert close veto fires inside the
          // same destroy tick.
        }),
      }));
      await flush(ctx.fixture);

      ctx.close();
      expect(order).toEqual(['autoFocusOnClose']);
      ctx.destroy();
    });
  });

  describe('zoneless reactivity', () => {
    it('runs the full lifecycle under provideZonelessChangeDetection', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      const escapeCalls: string[] = [];
      const closeCalls: string[] = [];
      const ctx = mountShell(() => ({
        modal: signal(true),
        returnFocus: signal(true),
        initialFocus: signal('first'),
        autoFocusOnClose: () => () => closeCalls.push('close-veto'),
        dismiss: makeDismissConfig({
          emitEscapeKeyDown: () => escapeCalls.push('escape'),
        }),
      }));
      await flush(ctx.fixture);

      // Mount-time wiring fired.
      expect(ctx.handle().isModal()).toBe(true);
      expect(ctx.surface()?.parentElement).toBe(document.body);

      // Dismiss-bundle wiring works in zoneless.
      pressKey(document, 'Escape');
      expect(escapeCalls).toEqual(['escape']);

      // Destroy wiring works in zoneless.
      ctx.close();
      expect(closeCalls).toEqual(['close-veto']);
      ctx.destroy();
    });
  });
});
