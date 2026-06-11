import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  afterEachOverlayCleanup,
  flush,
  flushPositioning,
  pressKey,
  renderHost,
} from '../../test-utils';
import { ForContextMenu } from '../context-menu/context-menu';
import { ForDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { ForDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';
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
          <button id="cut" forMenuItem (select)="lastSelected.set('cut')">Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div id="sub-content" forMenuSubContent>
                <button id="advanced" forMenuItem (select)="lastSelected.set('advanced')">
                  Advanced
                </button>
                <button id="reset" forMenuItem (select)="lastSelected.set('reset')">Reset</button>
              </div>
            }
          </div>
          <button id="paste" forMenuItem (select)="lastSelected.set('paste')">Paste</button>
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

/**
 * Builds a pointer event with an explicit `pointerType`. jsdom's
 * `PointerEvent` constructor doesn't populate `pointerType` / `clientX` /
 * `clientY` from its init dict, and the hover listeners gate on
 * `pointerType === 'mouse'`, so the spec defines them directly.
 */
function pointerEvent(
  type: 'pointerenter' | 'pointerleave',
  { pointerType = 'mouse', clientX = 0, clientY = 0 } = {},
): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperties(event, {
    pointerType: { value: pointerType, configurable: true },
    clientX: { value: clientX, configurable: true },
    clientY: { value: clientY, configurable: true },
  });
  return event;
}

describe('ForMenuSub', () => {
  afterEachOverlayCleanup();

  describe('a11y baseline', () => {
    it('wires aria-haspopup, aria-expanded, aria-controls on the SubTrigger', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      expect(more.getAttribute('role')).toBe('menuitem');
      expect(more.getAttribute('aria-haspopup')).toBe('menu');
      expect(more.getAttribute('aria-expanded')).toBe('false');
      expect(more.hasAttribute('aria-controls')).toBe(false);

      r.instance.subOpen.set(true);
      await flush(r.fixture);

      expect(more.getAttribute('aria-expanded')).toBe('true');
      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      expect(more.getAttribute('aria-controls')).toBe(subContent.id);
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

  describe('pointer hover (mouse)', () => {
    // Fake timers drive the open / close / grace delays deterministically.
    // Paired restore in afterEach per the test-isolation non-negotiables.
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('hovering the SubTrigger opens the submenu after subMenuOpenDelay (default 100ms)', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      flush();

      vi.advanceTimersByTime(99);
      flush();
      expect(instance.subOpen()).toBe(false);

      vi.advanceTimersByTime(1);
      flush();
      expect(instance.subOpen()).toBe(true);
      expect(document.querySelector('[forMenuSubContent]')).not.toBeNull();
    });

    it('leaving the SubTrigger before the open delay cancels the hover-open', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(50);

      more.dispatchEvent(pointerEvent('pointerleave', { clientX: 10, clientY: 10 }));
      flush();
      vi.advanceTimersByTime(500);
      flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('ignores non-mouse pointer enter (touch opens via tap, not hover)', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter', { pointerType: 'touch' }));
      flush();
      vi.advanceTimersByTime(500);
      flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('hovering a disabled SubTrigger never opens', () => {
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
      flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(500);
      flush();

      expect(instance.subOpen()).toBe(false);
    });

    it('leaving the submenu content closes it after subMenuCloseDelay (default 100ms)', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();
      instance.subOpen.set(true);
      flush();

      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      subContent.dispatchEvent(pointerEvent('pointerleave', { clientX: 999, clientY: 999 }));
      flush();

      vi.advanceTimersByTime(99);
      flush();
      expect(instance.subOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      flush();
      expect(instance.subOpen()).toBe(false);
    });

    it('re-entering the submenu content cancels a pending close', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();
      instance.subOpen.set(true);
      flush();

      const subContent = document.querySelector<HTMLElement>('[forMenuSubContent]')!;
      subContent.dispatchEvent(pointerEvent('pointerleave', { clientX: 999, clientY: 999 }));
      flush();
      subContent.dispatchEvent(pointerEvent('pointerenter'));
      flush();

      vi.advanceTimersByTime(500);
      flush();
      expect(instance.subOpen()).toBe(true);
    });

    it('leaving the SubTrigger arms a grace hold before closing (does not close immediately)', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();
      instance.subOpen.set(true);
      flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerleave', { clientX: 10, clientY: 10 }));
      flush();
      // Still open right after leaving — the pointer-grace window holds it.
      expect(instance.subOpen()).toBe(true);

      // Grace window (300ms) lapses, then the close delay (100ms) elapses.
      vi.advanceTimersByTime(300);
      flush();
      vi.advanceTimersByTime(100);
      flush();
      expect(instance.subOpen()).toBe(false);
    });

    it('a keyboard open (ArrowRight) supersedes a pending hover-open timer', () => {
      const { instance, flush } = renderHost(SubMenuHost);
      instance.open.set(true);
      flush();

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      // Open immediately by keyboard before the hover delay fires.
      more.focus();
      pressKey(more, 'ArrowRight');
      flush();
      expect(instance.subOpen()).toBe(true);

      // The stale hover-open timer firing must not disturb the open submenu.
      vi.advanceTimersByTime(500);
      flush();
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

      it('honours an overridden subMenuOpenDelay', () => {
        const { instance, flush } = renderHost(ConfiguredHost);
        flush();

        const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
        more.dispatchEvent(pointerEvent('pointerenter'));
        flush();

        vi.advanceTimersByTime(249);
        flush();
        expect(instance.subOpen()).toBe(false);

        vi.advanceTimersByTime(1);
        flush();
        expect(instance.subOpen()).toBe(true);
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

  describe('zoneless', () => {
    it('submenu open state stays reactive without zone.js', async () => {
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

    it('pointer hover-open stays reactive without zone.js', async () => {
      // subMenuOpenDelay: 0 makes the hover-open synchronous, so this asserts
      // the pointer path drives change detection without relying on fake
      // timers — purely on signals under provideZonelessChangeDetection.
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
});
