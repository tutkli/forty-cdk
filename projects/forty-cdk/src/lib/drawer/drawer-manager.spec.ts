import { Component, inject, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../test-utils';
import { ForDrawer } from './drawer';
import { ForDrawerBackdrop } from './drawer-backdrop';
import { ForDrawerClose } from './drawer-close';
import { ForDrawerDescription } from './drawer-description';
import { ForDrawerHandle } from './drawer-handle';
import { ForDrawerManager, FOR_DRAWER_DATA, injectDrawerData } from './drawer-manager';
import { ForDrawerRef } from './drawer-ref';
import { ForDrawerTitle } from './drawer-title';
import { provideForDrawerDefaults } from './drawer-defaults';

interface SheetData {
  message: string;
}

@Component({
  template: `
    <p id="message">{{ data.message }}</p>
    <button id="ok" (click)="ok()">OK</button>
    <button id="cancel" (click)="cancel()">Cancel</button>
  `,
})
class SheetDrawer {
  readonly data = injectDrawerData<SheetData>();
  readonly ref = inject(ForDrawerRef) as ForDrawerRef<'confirm' | 'cancel'>;

  ok(): void {
    this.ref.close('confirm');
  }
  cancel(): void {
    this.ref.close('cancel');
  }
}

@Component({ template: `<p>token check: {{ tokenValue }}</p>` })
class TokenCheck {
  readonly tokenValue = inject(FOR_DRAWER_DATA, { optional: true }) as string | null;
}

function setup(extraProviders: Parameters<typeof TestBed.configureTestingModule>[0] = {}): {
  drawers: ForDrawerManager;
  trigger: HTMLButtonElement;
} {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...(extraProviders.providers ?? [])],
  });
  const drawers = TestBed.inject(ForDrawerManager);
  const trigger = document.createElement('button');
  trigger.id = 'external-trigger';
  trigger.textContent = 'open';
  document.body.appendChild(trigger);
  trigger.focus();
  return { drawers, trigger };
}

describe('ForDrawerManager (programmatic)', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    document.querySelectorAll('#external-trigger').forEach((n) => n.remove());
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    TestBed.resetTestingModule();
  });

  describe('open()', () => {
    it('returns a ForDrawerRef synchronously', () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'hi' } });
      expect(ref).toBeInstanceOf(ForDrawerRef);
    });

    it('mounts the component to body with role=dialog and aria-modal', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'hi' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.parentElement).toBe(document.body);
      expect(host.getAttribute('aria-modal')).toBe('true');
      expect(host.getAttribute('data-side')).toBe('bottom');
    });

    it('reflects data-side from the side option', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'hi' }, side: 'right' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('right');
    });

    it('applies the alert role when alert: true', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'hi' }, alert: true });
      expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    });

    it('passes data via FOR_DRAWER_DATA', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'Hello world' } });
      expect(document.querySelector('#message')!.textContent).toBe('Hello world');
    });

    it('passes null for FOR_DRAWER_DATA when no data is configured', () => {
      const { drawers } = setup();
      drawers.open(TokenCheck);
      expect(document.querySelector('p')!.textContent).toBe('token check: ');
    });

    it('counts open drawers reactively', () => {
      const { drawers } = setup();
      expect(drawers.openCount()).toBe(0);
      const a = drawers.open(SheetDrawer, { data: { message: 'a' } });
      const b = drawers.open(SheetDrawer, { data: { message: 'b' } });
      expect(drawers.openCount()).toBe(2);
      a.close();
      b.close();
      expect(drawers.openCount()).toBe(0);
    });
  });

  describe('ForDrawerRef.close', () => {
    it('resolves closed with the result', async () => {
      const { drawers } = setup();
      const ref = drawers.open<SheetDrawer, 'confirm' | 'cancel', SheetData>(SheetDrawer, {
        data: { message: 'x' },
      });

      document.querySelector<HTMLButtonElement>('#ok')!.click();
      expect(await ref.closed).toBe('confirm');
    });

    it('reflects result and isClosed reactively', async () => {
      const { drawers } = setup();
      const ref = drawers.open<SheetDrawer, 'confirm' | 'cancel', SheetData>(SheetDrawer, {
        data: { message: 'x' },
      });
      expect(ref.isClosed()).toBe(false);

      document.querySelector<HTMLButtonElement>('#cancel')!.click();
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
      expect(ref.result()).toBe('cancel');
    });

    it('removes the host element on close', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();
      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('is idempotent', async () => {
      const { drawers } = setup();
      const ref = drawers.open<SheetDrawer, string>(SheetDrawer, {
        data: { message: 'x' },
      });
      ref.close('first');
      ref.close('second');
      expect(await ref.closed).toBe('first');
    });
  });

  describe('focus management', () => {
    it('focuses the first focusable on open', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(document.activeElement?.id).toBe('ok');
    });

    it('returns focus to the previously focused element on close', async () => {
      const { drawers, trigger } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      ref.close();
      await ref.closed;
      TestBed.tick();
      expect(document.activeElement).toBe(trigger);
    });

    it('honors returnFocus: false', async () => {
      const { drawers, trigger } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        returnFocus: false,
      });
      ref.close();
      await ref.closed;
      TestBed.tick();
      expect(document.activeElement).not.toBe(trigger);
    });

    it('skips initial focus when autoFocusOnOpen calls preventDefault', () => {
      const { drawers, trigger } = setup();
      trigger.focus();
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        autoFocusOnOpen: (e) => e.preventDefault(),
      });
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('Escape key', () => {
    it('closes a dismissible drawer', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      pressKey(document, 'Escape');
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
    });

    it('is ignored when dismissible: false', () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' }, dismissible: false });
      pressKey(document, 'Escape');
      expect(ref.isClosed()).toBe(false);
      ref.close();
    });
  });

  describe('per-channel dismiss hooks (#678)', () => {
    // The whole suite runs under `provideZonelessChangeDetection()` (see
    // `setup()`), so this block doubles as the zoneless coverage for the hooks.
    it('interactOutside veto keeps a dismissible drawer open on outside pointer-down while Escape still closes', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        interactOutside: (event) => event.preventDefault(),
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(ref.isClosed()).toBe(false);

      pressKey(document, 'Escape');
      await ref.closed;
      expect(ref.isClosed()).toBe(true);

      outside.remove();
    });

    it('pointerDownOutside veto suppresses the outside-click close', () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        pointerDownOutside: (event) => event.preventDefault(),
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(ref.isClosed()).toBe(false);

      outside.remove();
      ref.close();
    });

    it('escapeKeyDown veto suppresses the Escape close', () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        escapeKeyDown: (event) => event.preventDefault(),
      });

      pressKey(document, 'Escape');
      expect(ref.isClosed()).toBe(false);

      ref.close();
    });

    it('passes the originating DOM events to the callbacks (parity with the declarative outputs)', () => {
      const { drawers } = setup();
      let pointerEvent: Event | undefined;
      let interactEvent: Event | undefined;
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        pointerDownOutside: (event) => {
          pointerEvent = event.event;
          event.preventDefault();
        },
        interactOutside: (event) => {
          interactEvent = event.event;
        },
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);
      const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      outside.dispatchEvent(pointerDown);

      expect(pointerEvent).toBe(pointerDown);
      expect(interactEvent).toBe(pointerDown);
      expect(ref.isClosed()).toBe(false);

      outside.remove();
      ref.close();
    });
  });

  describe('body scroll lock', () => {
    it('locks while modal drawer is open and clears on close', async () => {
      document.body.style.overflow = 'auto';
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(document.body.style.overflow).toBe('hidden');
      ref.close();
      await ref.closed;
      TestBed.tick();
      expect(document.body.style.overflow).toBe('');
    });

    it('does NOT lock for non-modal drawers', () => {
      document.body.style.overflow = 'auto';
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, modal: false });
      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('defaults provider', () => {
    it('side from provideForDrawerDefaults applies when config omits it', () => {
      const { drawers } = setup({
        providers: [provideForDrawerDefaults({ side: 'right' })],
      });
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('right');
    });

    it('config option overrides the defaults provider', () => {
      const { drawers } = setup({
        providers: [provideForDrawerDefaults({ side: 'right' })],
      });
      drawers.open(SheetDrawer, { data: { message: 'x' }, side: 'left' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('left');
    });
  });

  describe('closeThreshold validation', () => {
    it('throws when closeThreshold is greater than 1', () => {
      const { drawers } = setup();
      expect(() =>
        drawers.open(SheetDrawer, { data: { message: 'x' }, closeThreshold: 2 }),
      ).toThrow('[forty-cdk/drawer] closeThreshold must be in [0, 1], got 2.');
    });

    it('throws when closeThreshold is NaN', () => {
      const { drawers } = setup();
      expect(() =>
        drawers.open(SheetDrawer, { data: { message: 'x' }, closeThreshold: Number.NaN }),
      ).toThrow('[forty-cdk/drawer] closeThreshold must be in [0, 1], got NaN.');
    });

    it('accepts a valid closeThreshold of 0.5', () => {
      const { drawers } = setup();
      expect(() =>
        drawers.open(SheetDrawer, { data: { message: 'x' }, closeThreshold: 0.5 }),
      ).not.toThrow();
    });
  });

  // ---- New coverage for #171 — manager runs `[forDrawer]` for real ----

  describe('host attribute single-source-of-truth', () => {
    it('emits a single role / aria-modal / data-side / tabindex (no duplication)', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      const hosts = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      expect(hosts.length).toBe(1);
      const host = hosts[0]!;
      expect(host.getAttribute('aria-modal')).toBe('true');
      expect(host.getAttribute('data-side')).toBe('bottom');
      expect(host.getAttribute('tabindex')).toBe('-1');
      expect(host.getAttribute('data-state')).toBe('open');
    });

    it('reflects data-depth="0" so the directive — not the manager — owns topology', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(
        document.querySelector<HTMLElement>('[role="dialog"]')!.getAttribute('data-depth'),
      ).toBe('0');
    });
  });

  describe('forwarded inputs from ForDrawerOpenConfig', () => {
    it('snapPoints + defaultSnapPoint reach the directive', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        snapPoints: ['148px', '50%', 1],
        defaultSnapPoint: '50%',
      });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-active-snap-point')).toBe('50%');
    });

    it('defaultSnapPoint omitted falls back to snapPoints[0]', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        snapPoints: ['148px', '50%', 1],
      });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-active-snap-point')).toBe('148px');
    });

    it('alert: true forces role="alertdialog" via the directive', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, alert: true });
      expect(
        document.querySelector<HTMLElement>('[role="alertdialog"]')!.getAttribute('aria-modal'),
      ).toBe('true');
    });

    it('modal: false drops aria-modal and skips scroll lock', () => {
      document.body.style.overflow = 'auto';
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, modal: false });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.hasAttribute('aria-modal')).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('drag / release / active-snap observability', () => {
    it('onActiveSnapPointChange fires with the landed default snap on mount', () => {
      const { drawers } = setup();
      const landed: (string | number | null)[] = [];
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        snapPoints: ['148px', '50%', 1],
        onActiveSnapPointChange: (snap) => landed.push(snap),
      });
      expect(landed).toEqual(['148px']);
    });

    it('does not invoke onActiveSnapPointChange when the consumer pins defaultSnapPoint', () => {
      const { drawers } = setup();
      const landed: (string | number | null)[] = [];
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        snapPoints: ['148px', '50%', 1],
        defaultSnapPoint: '50%',
        onActiveSnapPointChange: (snap) => landed.push(snap),
      });
      expect(landed).toEqual([]);
    });

    it('accepts onDrag / onRelease callbacks without throwing', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        snapPoints: ['148px', 1],
        onDrag: () => {},
        onRelease: () => {},
      });
      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();
      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('stops emitting onActiveSnapPointChange after close', async () => {
      const { drawers } = setup();
      const landed: (string | number | null)[] = [];
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        snapPoints: ['148px', '50%', 1],
        onActiveSnapPointChange: (snap) => landed.push(snap),
      });
      expect(landed).toEqual(['148px']);
      ref.close();
      await ref.closed;
      expect(landed).toEqual(['148px']);
    });
  });

  describe('child pieces work inside the opened component', () => {
    @Component({
      imports: [
        ForDrawerBackdrop,
        ForDrawerHandle,
        ForDrawerTitle,
        ForDrawerDescription,
        ForDrawerClose,
      ],
      template: `
        <div data-testid="bd" forDrawerBackdrop></div>
        <div data-testid="hd" forDrawerHandle></div>
        <h2 data-testid="title" forDrawerTitle>Title</h2>
        <p data-testid="desc" forDrawerDescription>Desc</p>
        <button id="close-with" forDrawerClose [closeWith]="payload">Close</button>
      `,
    })
    class FullPiecesDrawer {
      readonly payload = { reason: 'user-confirmed' };
    }

    it('wires aria-labelledby and aria-describedby from forDrawerTitle / forDrawerDescription', () => {
      const { drawers } = setup();
      drawers.open(FullPiecesDrawer);
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const title = document.querySelector<HTMLElement>('[data-testid="title"]')!;
      const desc = document.querySelector<HTMLElement>('[data-testid="desc"]')!;
      expect(host.getAttribute('aria-labelledby')).toBe(title.id);
      expect(host.getAttribute('aria-describedby')).toBe(desc.id);
    });

    it('forDrawerHandle reflects aria-hidden inside a manager-opened drawer', () => {
      const { drawers } = setup();
      drawers.open(FullPiecesDrawer);
      const handle = document.querySelector<HTMLElement>('[data-testid="hd"]')!;
      expect(handle.getAttribute('aria-hidden')).toBe('true');
    });

    it('forDrawerBackdrop is registered (markers and data-state mirror the directive)', () => {
      const { drawers } = setup();
      drawers.open(FullPiecesDrawer);
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;
      expect(backdrop.getAttribute('data-state')).toBe('open');
      expect(backdrop.hasAttribute('data-for-modal-peer')).toBe(true);
    });

    it('forDrawerClose [closeWith] propagates the payload to ForDrawerRef.close(value)', async () => {
      const { drawers } = setup();
      const ref = drawers.open<FullPiecesDrawer, { reason: string }>(FullPiecesDrawer);
      document.querySelector<HTMLButtonElement>('#close-with')!.click();
      const result = await ref.closed;
      expect(result).toEqual({ reason: 'user-confirmed' });
      expect(ref.result()).toEqual({ reason: 'user-confirmed' });
    });
  });

  describe('mixed declarative + programmatic stacking', () => {
    @Component({
      imports: [ForDrawer],
      template: `
        @if (open()) {
          <div forDrawer id="parent" ariaLabel="Parent" (close)="open.set(false)"></div>
        }
      `,
    })
    class DeclarativeRoot {
      readonly open = signal(false);
    }

    @Component({
      template: `<button id="child-content">child</button>`,
    })
    class ProgrammaticChild {}

    it('manager-opened drawer registers depth=0 alongside an open declarative drawer', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const r = renderHost(DeclarativeRoot);
      r.instance.open.set(true);
      await flush(r.fixture);

      const drawers = TestBed.inject(ForDrawerManager);
      drawers.open(ProgrammaticChild);

      const parent = document.querySelector<HTMLElement>('#parent')!;
      const programmatic = document.querySelector<HTMLElement>('[role="dialog"]:not(#parent)')!;

      // Both registered against the stack so depth attribute is present on each.
      expect(parent.getAttribute('data-depth')).toBe('0');
      expect(programmatic.getAttribute('data-depth')).toBe('0');
      // Both portaled to body — sibling layout.
      expect(parent.parentElement).toBe(document.body);
      expect(programmatic.parentElement).toBe(document.body);
    });

    it('Escape closes the topmost (programmatic) layer first when stacked above a declarative drawer', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const r = renderHost(DeclarativeRoot);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('#parent')).not.toBeNull();

      const drawers = TestBed.inject(ForDrawerManager);
      const ref = drawers.open(ProgrammaticChild);

      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(ref.isClosed()).toBe(true);
      // Declarative drawer is still mounted underneath.
      expect(r.instance.open()).toBe(true);
      expect(document.querySelector<HTMLElement>('#parent')).not.toBeNull();
    });
  });

  describe('defaults provider — every key flows through', () => {
    it('side=right from defaults is overridden by config.side=left', () => {
      const { drawers } = setup({
        providers: [provideForDrawerDefaults({ side: 'right' })],
      });
      drawers.open(SheetDrawer, { data: { message: 'x' }, side: 'left' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('left');
    });

    it('returnFocus default of false from provider takes effect', async () => {
      const { drawers, trigger } = setup({
        providers: [provideForDrawerDefaults({ returnFocus: false })],
      });
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      ref.close();
      await ref.closed;
      expect(document.activeElement).not.toBe(trigger);
    });
  });

  describe('consumer class (open({ class }) / classList)', () => {
    it('applies a single class to the overlay root', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, class: 'my-drawer' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-drawer')).toBe(true);
    });

    it('applies a space-separated class string', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, class: 'my-drawer my-drawer--lg' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-drawer')).toBe(true);
      expect(host.classList.contains('my-drawer--lg')).toBe(true);
    });

    it('applies an array via classList', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, classList: ['my-drawer', 'lg'] });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-drawer')).toBe(true);
      expect(host.classList.contains('lg')).toBe(true);
    });

    it('merges and de-dups class + classList', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, class: 'a b', classList: ['b', 'c'] });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.className.split(/\s+/).filter(Boolean).sort()).toEqual(['a', 'b', 'c']);
    });

    it('lands alongside data-side without clobbering host attributes', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, side: 'right', class: 'my-drawer' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-drawer')).toBe(true);
      expect(host.getAttribute('data-side')).toBe('right');
      expect(host.getAttribute('data-state')).toBe('open');
      expect(host.getAttribute('aria-modal')).toBe('true');
      expect(host.getAttribute('tabindex')).toBe('-1');
    });

    it('leaves the host class-less when neither class nor classList is set', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.className).toBe('');
    });
  });

  describe('exit-animation / control-flow contract (#677)', () => {
    it('isClosed() flips true and closed promise resolves immediately on close', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });

      expect(ref.isClosed()).toBe(false);
      ref.close();
      expect(ref.isClosed()).toBe(true);
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
    });

    it('host is removed from document.body after a CD cycle (one TestBed.tick)', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('closing one of N drawers leaves the others mounted', async () => {
      const { drawers } = setup();
      const a = drawers.open(SheetDrawer, { data: { message: 'a' } });
      const b = drawers.open(SheetDrawer, { data: { message: 'b' } });

      a.close();
      await a.closed;
      TestBed.tick();

      expect(a.isClosed()).toBe(true);
      expect(b.isClosed()).toBe(false);
      expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);

      b.close();
    });

    it('zoneless open + close (provideZonelessChangeDetection)', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('accepts animateEnter / animateLeave config and mounts', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        animateEnter: 'drawer-in',
        animateLeave: 'drawer-out',
      });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  // ---- Backdrop exit animation under the manager ----
  // A backdrop declared inside the opened component plays its `animate.enter`
  // on mount but cannot run a template `animate.leave` (Angular does not
  // process leave animations across the `ngComponentOutlet` the manager mounts
  // the component through), so the manager drives the backdrop's exit class in
  // lockstep with the host — matched by a shared per-instance id.
  describe('backdrop exit animation (backdropAnimateLeave)', () => {
    @Component({
      imports: [ForDrawerBackdrop],
      template: `
        <div data-testid="bd" forDrawerBackdrop></div>
        <button id="ok">OK</button>
      `,
    })
    class BackdropDrawer {}

    it('pairs the portaled backdrop with its drawer via data-for-drawer-id', () => {
      const { drawers } = setup();
      drawers.open(BackdropDrawer);
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;
      const id = host.getAttribute('data-for-drawer-id');
      expect(id).toBeTruthy();
      expect(backdrop.getAttribute('data-for-drawer-id')).toBe(id);
    });

    it('drives the backdrop exit class in lockstep with the host on close', async () => {
      const { drawers } = setup();
      const ref = drawers.open(BackdropDrawer, {
        animateLeave: 'drawer-out',
        backdropAnimateLeave: 'backdrop-out',
      });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;

      // jsdom ships no Web Animations engine; fake a running animation so the
      // manager keeps both nodes mounted through the exit and applies the
      // classes rather than tearing down immediately.
      const running = () => [{ finished: Promise.resolve() }] as unknown as Animation[];
      host.getAnimations = running;
      backdrop.getAnimations = running;

      ref.close();

      expect(host.classList.contains('drawer-out')).toBe(true);
      expect(backdrop.classList.contains('backdrop-out')).toBe(true);

      await ref.closed;
    });

    it('closes cleanly when backdropAnimateLeave is set but no backdrop is rendered', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        backdropAnimateLeave: 'backdrop-out',
      });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });
  });
});
