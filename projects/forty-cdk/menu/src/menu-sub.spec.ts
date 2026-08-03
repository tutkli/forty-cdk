import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  afterEachOverlayCleanup,
  flush,
  flushPositioning,
  pressKey,
  renderHost,
} from '../../src/test-utils';
import {
  assertDismissibleLayerContract,
  assertOverlayTriggerAriaContract,
} from '../../src/test-utils/contract';
import { type VetoableNativeEvent, type WritingDirection } from 'forty-cdk/core';
import { ForContextMenu } from 'forty-cdk/context-menu';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';

import { ForMenuContent } from './menu-content';
import { provideForMenuDefaults } from './menu-defaults';
import { ForMenuItem } from './menu-item';
import { ForMenuSub } from './menu-sub';
import { ForMenuSubTrigger } from './menu-sub-trigger';

const IMPORTS = [
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuContent,
  ForMenuItem,
  ForMenuSub,
  ForMenuSubTrigger,
];

@Component({
  imports: IMPORTS,
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div id="parent-content" forMenuContent>
          <button id="cut" forMenuItem (activate)="lastSelected.set('cut')">Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div id="sub-content" forMenuSubContent>
                <button id="advanced" forMenuItem (activate)="lastSelected.set('advanced')">
                  Advanced
                </button>
                <button id="reset" forMenuItem (activate)="lastSelected.set('reset')">Reset</button>
              </div>
            }
          </div>
          <button id="paste" forMenuItem (activate)="lastSelected.set('paste')">Paste</button>
        </div>
      }
    </div>
  `,
})
class SubMenuHost {
  readonly open = signal(false);
  readonly subOpen = signal(false);
  readonly lastSelected = signal<string | null>(null);
}

@Component({
  imports: IMPORTS,
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <div
            forMenuSub
            [(open)]="subOpen"
            [dismissible]="dismissible()"
            (escapeKeyDown)="onEscape($event)"
            (pointerDownOutside)="onPointer($event)"
            (focusOutside)="onFocus($event)"
            (interactOutside)="onInteract($event)"
          >
            <button forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div forMenuSubContent>
                <button forMenuItem>Advanced</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class SubMenuDismissContractHost {
  readonly open = signal(false);
  readonly subOpen = signal(false);
  readonly dismissible = signal(true);
  escapeVeto = false;
  pointerVeto = false;
  eCount = 0;
  pCount = 0;
  fCount = 0;
  iCount = 0;
  onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    this.eCount += 1;
    if (this.escapeVeto) event.preventDefault();
  }
  onPointer(event: VetoableNativeEvent<PointerEvent>): void {
    this.pCount += 1;
    if (this.pointerVeto) event.preventDefault();
  }
  onFocus(_event: VetoableNativeEvent<FocusEvent>): void {
    this.fCount += 1;
  }
  onInteract(_event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.iCount += 1;
  }
}

function pointerEvent(
  type: 'pointerenter' | 'pointerleave' | 'pointermove',
  { pointerType = 'mouse', clientX = 0, clientY = 0 } = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerType,
    clientX,
    clientY,
  });
}

describe('ForMenuSub', () => {
  afterEachOverlayCleanup();

  assertOverlayTriggerAriaContract(
    {
      mount: async () => {
        const r = renderHost(SubMenuHost);
        r.instance.open.set(true);
        await flush(r.fixture);
        return {
          trigger: document.querySelector<HTMLElement>('[forMenuSubTrigger]')!,
          flush: () => flush(r.fixture),
          open: () => r.instance.subOpen.set(true),
          surface: () => document.querySelector<HTMLElement>('[forMenuSubContent]')!,
        };
      },
    },
    { haspopup: 'menu' },
  );

  describe('a11y baseline', () => {
    it('gives the SubTrigger the menuitem role', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      expect(more.getAttribute('role')).toBe('menuitem');
    });

    it('labels submenu content by its sub-trigger', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('#more')!;
      const subContent = document.querySelector<HTMLElement>('#sub-content')!;
      expect(more.id).toBeTruthy();
      expect(subContent.getAttribute('aria-labelledby')).toBe(more.id);
    });

    it('reflects data-state on SubTrigger and SubContent', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      expect(more.getAttribute('data-state')).toBe('open');
      expect(subContent.getAttribute('data-state')).toBe('open');
    });
  });

  // Where these tests open the submenu, the focus *move* into the submenu's
  // first item is a focus outcome (jsdom mis-models it) asserted against a real
  // browser in menu-sub.e2e.ts. The Vitest layer asserts the open-state wiring
  // (`subOpen` flips) and, where an item carries it, the host-bound
  // `data-highlighted` reaction that marks the selected item. See testing.md §E2E.
  describe('opening', () => {
    it('keyboard-style click (no preceding pointerdown) opens the submenu and highlights its first item', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('[forMenuSubTrigger]')!.click();
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.querySelector('#advanced')!.getAttribute('data-highlighted')).toBe('');
    });

    it('pointer click opens the submenu without highlighting its first item', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLButtonElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      more.click();
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.activeElement?.id).toBe('advanced');
      expect(document.querySelector('[forMenuSubContent] [data-highlighted]')).toBeNull();
    });

    it('ArrowRight on the SubTrigger opens the submenu', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      pressKey(more, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.querySelector('#advanced')!.getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowRight on an already-open SubTrigger moves focus into the submenu', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      await flush(r.fixture);

      pressKey(more, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.activeElement?.id).toBe('advanced');
    });

    it('disabled SubTrigger is a no-op on click and ArrowRight', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen">
                  <button id="more" forMenuSubTrigger disabled>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent>
                      <button forMenuItem>A</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly subOpen = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      expect(more.getAttribute('aria-disabled')).toBe('true');

      more.click();
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(false);

      pressKey(more, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(false);
    });
  });

  describe('parent navigation reaches the SubTrigger', () => {
    // The SubTrigger does not host-bind `data-highlighted`, so "ArrowDown from
    // the previous parent item lands on the SubTrigger" is a pure focus outcome
    // — asserted against a real browser in menu-sub.e2e.ts (the keyboard
    // ArrowRight flow first ArrowDowns onto `dd-sub-trigger`).

    it('ArrowDown from the SubTrigger highlights the next parent item', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      pressKey(more, 'ArrowDown');
      await flush(r.fixture);

      expect(document.querySelector('#paste')!.getAttribute('data-highlighted')).toBe('');
    });
  });

  describe('Space mid-typeahead does not open the submenu', () => {
    it('leaves an empty-buffer Space free to activate the sub-trigger natively', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLButtonElement>('#more')!;
      more.focus();
      const ev = pressKey(more, ' ');
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(false);
    });

    it('suppresses a Space consumed by the parent typeahead', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLButtonElement>('#more')!;
      more.focus();
      pressKey(more, 'z');
      await flush(r.fixture);

      const ev = pressKey(more, ' ');
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(true);
      expect(r.instance.subOpen()).toBe(false);
    });
  });

  describe('same-render-pass mount (#1450)', () => {
    it('keeps the whole chain open when the first focus lands inside the submenu', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLElement>('#advanced')!.focus();
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(r.instance.open()).toBe(true);
    });

    it('dispatches Escape to the submenu, not the parent menu', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('closing', () => {
    it('ArrowLeft inside the submenu closes only the submenu', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const advanced = document.querySelector<HTMLElement>('#advanced')!;
      advanced.focus();
      pressKey(advanced, 'ArrowLeft');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(true);
    });

    it('ArrowRight inside the submenu is a no-op without an enclosing menubar (LTR)', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const advanced = document.querySelector<HTMLElement>('#advanced')!;
      advanced.focus();
      const event = pressKey(advanced, 'ArrowRight');
      await flush(r.fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(r.instance.subOpen()).toBe(true);
      expect(r.instance.open()).toBe(true);
    });

    it('Escape inside the submenu closes only the submenu (parent stays open)', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(true);
    });

    it('item activation inside the submenu closes the entire chain', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#advanced')!.click();
      await flush(r.fixture);

      expect(r.instance.lastSelected()).toBe('advanced');
      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(false);
    });

    it('Tab inside the submenu closes the entire chain', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const advanced = document.querySelector<HTMLElement>('#advanced')!;
      advanced.focus();
      pressKey(advanced, 'Tab');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(false);
    });

    it('clicking outside everything closes the entire chain', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(false);
      outside.remove();
    });

    it('clicking a parent menu item does NOT fire the submenu outside-handler (item click closes everything)', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      // pointerdown on parent's #paste — submenu should treat that as inside
      // (parent content is in submenu's exempt list), so submenu doesn't close
      // from the layer; the click handler on #paste then activates and closes.
      const paste = document.querySelector<HTMLElement>('#paste')!;
      const pdEvent = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(pdEvent, 'target', { value: paste, configurable: true });
      Object.defineProperty(pdEvent, 'composedPath', { value: () => [paste], configurable: true });
      document.dispatchEvent(pdEvent);
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(r.instance.open()).toBe(true);

      // The actual click on the parent item now activates and tears down both menus.
      (paste as HTMLButtonElement).click();
      await flush(r.fixture);

      expect(r.instance.lastSelected()).toBe('paste');
      expect(r.instance.open()).toBe(false);
    });
  });

  assertDismissibleLayerContract({
    mount: async (options = {}) => {
      const r = renderHost(SubMenuDismissContractHost);
      r.instance.dismissible.set(options.dismissible ?? true);
      r.instance.escapeVeto = options.escapeVeto ?? false;
      r.instance.pointerVeto = options.pointerVeto ?? false;
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);
      return {
        flush: () => flush(r.fixture),
        isOpen: () => r.instance.subOpen(),
        escapeCount: () => r.instance.eCount,
        pointerOutsideCount: () => r.instance.pCount,
        focusOutsideCount: () => r.instance.fCount,
        interactOutsideCount: () => r.instance.iCount,
      };
    },
  });

  describe('hover-follows-pointer (#662)', () => {
    it('pointermove over the SubTrigger clears the parent item highlight without moving focus', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.dispatchEvent(pointerEvent('pointermove'));
      await flush();
      expect(cut.getAttribute('data-highlighted')).toBe('');
      expect(document.activeElement?.id).toBe('cut');

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointermove'));
      await flush();

      // The sub-trigger reflects no highlight and does not take focus
      // (hover-open never moves focus, #332); #cut just stops being highlighted.
      expect(cut.hasAttribute('data-highlighted')).toBe(false);
      expect(document.activeElement?.id).toBe('cut');
    });

    it('pointermove over a submenu item highlights it', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();
      instance.subOpen.set(true);
      await flush();

      const advanced = document.querySelector<HTMLElement>('#advanced')!;
      advanced.dispatchEvent(pointerEvent('pointermove'));
      await flush();

      expect(document.activeElement?.id).toBe('advanced');
      expect(advanced.getAttribute('data-highlighted')).toBe('');
    });
  });

  describe('pointer hover (mouse)', () => {
    // Fake timers drive the open / close / grace delays deterministically.
    // Paired restore in afterEach per the test-isolation non-negotiables.
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('hovering the SubTrigger opens the submenu after subMenuOpenDelay (default 100ms)', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      vi.advanceTimersByTime(99);
      await flush();
      expect(instance.subOpen()).toBe(false);

      vi.advanceTimersByTime(1);
      await flush();
      expect(instance.subOpen()).toBe(true);
      expect(document.querySelector('[forMenuSubContent]')).not.toBeNull();
    });

    it('leaving the SubTrigger before the open delay cancels the hover-open', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(50);

      more.dispatchEvent(pointerEvent('pointerleave', { clientX: 10, clientY: 10 }));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('ignores non-mouse pointer enter (touch opens via tap, not hover)', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter', { pointerType: 'touch' }));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('ignores a pen pointer enter (pen opens via tap, not hover)', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter', { pointerType: 'pen' }));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('a synthetic pointer enter with no pointerType opens the submenu (hover parity)', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter', { pointerType: '' }));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();

      expect(instance.subOpen()).toBe(true);
    });

    it('hovering a disabled SubTrigger never opens', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen">
                  <button forMenuSubTrigger disabled>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent><button forMenuItem>A</button></div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly subOpen = signal(false);
      }

      const { instance, flush } = renderHost(Host);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('leaving the submenu content closes it after subMenuCloseDelay (default 100ms)', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();
      instance.subOpen.set(true);
      await flush();

      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      subContent.dispatchEvent(pointerEvent('pointerleave', { clientX: 999, clientY: 999 }));
      await flush();

      vi.advanceTimersByTime(99);
      await flush();
      expect(instance.subOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      await flush();
      expect(instance.subOpen()).toBe(false);
    });

    it('re-entering the submenu content cancels a pending close', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();
      instance.subOpen.set(true);
      await flush();

      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      subContent.dispatchEvent(pointerEvent('pointerleave', { clientX: 999, clientY: 999 }));
      await flush();
      subContent.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      vi.advanceTimersByTime(500);
      await flush();
      expect(instance.subOpen()).toBe(true);
    });

    it('leaving the SubTrigger arms a grace hold before closing (does not close immediately)', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();
      instance.subOpen.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerleave', { clientX: 10, clientY: 10 }));
      await flush();
      // Still open right after leaving — the pointer-grace window holds it.
      expect(instance.subOpen()).toBe(true);

      // Grace window (300ms) lapses, then the close delay (100ms) elapses.
      vi.advanceTimersByTime(300);
      await flush();
      vi.advanceTimersByTime(100);
      await flush();
      expect(instance.subOpen()).toBe(false);
    });

    it('a keyboard open (ArrowRight) supersedes a pending hover-open timer', async () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      await flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      // Open immediately by keyboard before the hover delay fires.
      more.focus();
      pressKey(more, 'ArrowRight');
      await flush();
      expect(instance.subOpen()).toBe(true);

      // The stale hover-open timer firing must not disturb the open submenu.
      vi.advanceTimersByTime(500);
      await flush();
      expect(instance.subOpen()).toBe(true);
    });

    describe('configurable via provideForMenuDefaults', () => {
      @Component({
        imports: IMPORTS,
        providers: [provideForMenuDefaults({ subMenuOpenDelay: 250 })],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen">
                  <button forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent><button forMenuItem>A</button></div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class ConfiguredHost {
        readonly open = signal(true);
        readonly subOpen = signal(false);
      }

      it('honours an overridden subMenuOpenDelay', async () => {
        const { instance, flush } = renderHost(ConfiguredHost);
        await flush();

        const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
        more.dispatchEvent(pointerEvent('pointerenter'));
        await flush();

        vi.advanceTimersByTime(249);
        await flush();
        expect(instance.subOpen()).toBe(false);

        vi.advanceTimersByTime(1);
        await flush();
        expect(instance.subOpen()).toBe(true);
      });
    });

    describe('pointer paths route through the open/close pipeline (#1390 item 3)', () => {
      async function hoverOpen(flush: () => Promise<void>): Promise<void> {
        const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
        more.dispatchEvent(pointerEvent('pointerenter'));
        await flush();
        vi.advanceTimersByTime(100);
        await flush();
      }

      async function hoverCloseFromContent(flush: () => Promise<void>): Promise<void> {
        const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
        subContent.dispatchEvent(pointerEvent('pointerleave', { clientX: 999, clientY: 999 }));
        await flush();
        vi.advanceTimersByTime(100);
        await flush();
      }

      it('a programmatic open after a hover-close still moves focus into the submenu', async () => {
        const { instance, flush } = renderHost(SubMenuHost);
        instance.open.set(true);
        await flush();

        await hoverOpen(flush);
        expect(instance.subOpen()).toBe(true);

        await hoverCloseFromContent(flush);
        expect(instance.subOpen()).toBe(false);

        instance.subOpen.set(true);
        await flush();

        expect(document.activeElement?.id).toBe('advanced');
      });

      it('a hover-open still leaves focus outside the submenu', async () => {
        const { instance, flush } = renderHost(SubMenuHost);
        instance.open.set(true);
        await flush();

        await hoverOpen(flush);

        expect(instance.subOpen()).toBe(true);
        expect(document.activeElement?.id).not.toBe('advanced');
      });

      it('a hover-close still does not return focus to the sub-trigger', async () => {
        const { instance, flush } = renderHost(SubMenuHost);
        instance.open.set(true);
        await flush();

        const more = document.querySelector<HTMLElement>('#more')!;
        more.focus();
        pressKey(more, 'ArrowRight');
        await flush();
        expect(document.activeElement?.id).toBe('advanced');

        await hoverCloseFromContent(flush);

        expect(instance.subOpen()).toBe(false);
        expect(document.activeElement?.id).not.toBe('more');
      });

      it('a keyboard close after a hover-open returns focus to the sub-trigger', async () => {
        const { instance, flush } = renderHost(SubMenuHost);
        instance.open.set(true);
        await flush();

        await hoverOpen(flush);
        expect(instance.subOpen()).toBe(true);

        const advanced = document.querySelector<HTMLElement>('#advanced')!;
        advanced.focus();
        pressKey(advanced, 'ArrowLeft');
        await flush();

        expect(instance.subOpen()).toBe(false);
        expect(document.activeElement?.id).toBe('more');
      });

      it('resets lastCloseReason on a hover-open', async () => {
        const r = renderHost(SubMenuHost);
        r.instance.open.set(true);
        await flush(r.fixture);

        const sub = r.fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub);

        const more = document.querySelector<HTMLElement>('#more')!;
        more.focus();
        pressKey(more, 'ArrowRight');
        await flush(r.fixture);
        expect(r.instance.subOpen()).toBe(true);

        pressKey(document, 'Escape');
        await flush(r.fixture);
        expect(r.instance.subOpen()).toBe(false);
        expect(sub.lastCloseReason()).toBe('escape');

        await hoverOpen(() => flush(r.fixture));
        expect(r.instance.subOpen()).toBe(true);
        expect(sub.lastCloseReason()).toBeNull();
      });

      it('a hover-close collapses only the submenu, leaving the parent menu open', async () => {
        const { instance, flush } = renderHost(SubMenuHost);
        instance.open.set(true);
        await flush();

        await hoverOpen(flush);
        await hoverCloseFromContent(flush);

        expect(instance.subOpen()).toBe(false);
        expect(instance.open()).toBe(true);
        expect(document.querySelector('#parent-content')).not.toBeNull();
      });
    });
  });

  describe('orphan errors', () => {
    it('throws when [forMenuSub] is used outside a parent menu', () => {
      @Component({
        imports: [ForMenuSub],
        template: `<div forMenuSub></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => TestBed.createComponent(Orphan)).toThrow(/\[forMenuSub\] must be inside/);
    });

    it('throws when [forMenuSubTrigger] is used outside [forMenuSub]', () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuSubTrigger],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <button forMenuSubTrigger>orphan</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Host);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forMenuSubTrigger\] must be inside a \[forMenuSub\]/,
      );
    });
  });

  describe('RTL', () => {
    @Component({
      imports: IMPORTS,
      template: `
        <div forDropdownMenu [(open)]="open" [dir]="dir()">
          <button forDropdownMenuTrigger>Options</button>
          @if (open()) {
            <div forMenuContent>
              <button id="cut" forMenuItem>Cut</button>
              <div forMenuSub [(open)]="subOpen">
                <button id="more" forMenuSubTrigger>More</button>
                @if (subOpen()) {
                  <div forMenuSubContent>
                    <button id="advanced" forMenuItem>Advanced</button>
                    <button id="reset" forMenuItem>Reset</button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      `,
    })
    class RtlSubMenuHost {
      readonly open = signal(false);
      readonly subOpen = signal(false);
      readonly dir = signal<'ltr' | 'rtl'>('rtl');
    }

    it('ArrowLeft on the SubTrigger opens the submenu (RTL swap)', async () => {
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      pressKey(more, 'ArrowLeft');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.querySelector('#advanced')!.getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowRight on the SubTrigger does NOT open the submenu in RTL', async () => {
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      pressKey(more, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
    });

    it('ArrowRight inside a submenu item closes the submenu (RTL swap)', async () => {
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const advanced = document.querySelector<HTMLElement>('#advanced')!;
      advanced.focus();
      pressKey(advanced, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(false);
      expect(r.instance.open()).toBe(true);
    });

    it('ArrowLeft inside a submenu item is a no-op in RTL (does not close the submenu)', async () => {
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const advanced = document.querySelector<HTMLElement>('#advanced')!;
      advanced.focus();
      pressKey(advanced, 'ArrowLeft');
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
    });

    it('switching dir at runtime swaps the keyboard semantics live', async () => {
      const r = renderHost(RtlSubMenuHost);
      r.instance.dir.set('ltr');
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();

      // LTR: ArrowRight opens.
      pressKey(more, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);

      // Close, flip to RTL, retry — ArrowRight should now NOT open.
      r.instance.subOpen.set(false);
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      more.focus();
      pressKey(more, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(false);

      // ArrowLeft should now open.
      pressKey(more, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);
    });

    it('a submenu can override dir per instance', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" dir="ltr">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen" dir="rtl">
                  <button id="more" forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent>
                      <button id="advanced" forMenuItem>Advanced</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly subOpen = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      // Sub overrides to rtl; ArrowLeft opens.
      pressKey(more, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);
    });

    it('accepts an explicit [dir]="null" and falls back to the parent menu direction', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" dir="rtl">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen" [dir]="subDir()">
                  <button id="more" forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent>
                      <button id="advanced" forMenuItem>Advanced</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly subOpen = signal(false);
        readonly subDir = signal<WritingDirection | null>(null);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();

      pressKey(more, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);

      r.instance.subOpen.set(false);
      r.instance.subDir.set('ltr');
      await flush(r.fixture);
      more.focus();
      pressKey(more, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(false);

      pressKey(more, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);
    });

    it('ForContextMenu also exposes a dir input that propagates to its submenus', async () => {
      @Component({
        imports: [ForContextMenu, ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger],
        template: `
          <div forContextMenu [(open)]="open" dir="rtl">
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen">
                  <button id="more" forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent>
                      <button id="leaf" forMenuItem>Leaf</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly subOpen = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      pressKey(more, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);
    });

    it('default submenu side flips to "left" in RTL', async () => {
      // Assert against the DOM contract reflected by `injectFloating` on the
      // submenu content: `data-side` / `data-align` mirror the resolved
      // placement. In RTL the submenu defaults to side="left" align="start"
      // (no consumer override).
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flushPositioning(r.fixture);

      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      expect(subContent.dataset['side']).toBe('left');
      expect(subContent.dataset['align']).toBe('start');
    });

    it('a consumer-provided side overrides the RTL default (no auto-flip)', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" dir="rtl">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen" side="top" align="end">
                  <button forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent>
                      <button forMenuItem>Leaf</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly subOpen = signal(true);
      }

      const r = renderHost(Host);
      await flushPositioning(r.fixture);

      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      expect(subContent.dataset['side']).toBe('top');
      expect(subContent.dataset['align']).toBe('end');
    });
  });

  describe('reactive updates', () => {
    it('mounts and unmounts the submenu content on open writes', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.subOpen.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuSubContent]')).not.toBeNull();

      r.instance.subOpen.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuSubContent]')).toBeNull();
    });

    it('a pointerenter opens the submenu with a zero open delay', async () => {
      // subMenuOpenDelay: 0 makes the hover-open synchronous, so this asserts
      // the pointer path drives change detection without relying on fake
      // timers — purely on signals.
      @Component({
        imports: IMPORTS,
        providers: [provideForMenuDefaults({ subMenuOpenDelay: 0 })],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen">
                  <button forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div forMenuSubContent><button forMenuItem>A</button></div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly subOpen = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.querySelector('[forMenuSubContent]')).not.toBeNull();
    });
  });

  describe('fallbackAxisSideDirection input', () => {
    @Component({
      imports: IMPORTS,
      template: `
        <div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger>x</button>
          @if (open()) {
            <div forMenuContent>
              <div forMenuSub [(open)]="subOpen" [fallbackAxisSideDirection]="axis()">
                <button forMenuSubTrigger>More</button>
                @if (subOpen()) {
                  <div forMenuSubContent><button forMenuItem>A</button></div>
                }
              </div>
            </div>
          }
        </div>
      `,
    })
    class Host {
      readonly open = signal(true);
      readonly subOpen = signal(true);
      readonly axis = signal<'none' | 'start' | 'end'>('start');
    }

    it('exposes the consumer value on the submenu ForMenuContext (fed to [forMenuSubContent])', async () => {
      const r = renderHost(Host);
      await flush(r.fixture);

      const sub = r.fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub);
      expect(sub.fallbackAxisSideDirection()).toBe('start');
    });

    it('reacts to a runtime input change', async () => {
      const r = renderHost(Host);
      await flush(r.fixture);
      const sub = r.fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub);
      expect(sub.fallbackAxisSideDirection()).toBe('start');

      r.instance.axis.set('end');
      await flush(r.fixture);
      expect(sub.fallbackAxisSideDirection()).toBe('end');
    });
  });
});
