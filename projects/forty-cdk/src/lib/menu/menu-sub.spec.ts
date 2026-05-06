import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForContextMenu } from '../context-menu/context-menu';
import { ForDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { ForDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';
import { ForMenuContent } from './menu-content';
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
                <button id="reset" forMenuItem (select)="lastSelected.set('reset')">
                  Reset
                </button>
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

async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('ForMenuSub', () => {
  afterEach(() => {
    document.querySelectorAll('[forMenuContent], [forMenuSubContent]').forEach((n) => n.remove());
  });

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

  describe('opening', () => {
    it('clicking the SubTrigger opens the submenu and focuses its first item', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('[forMenuSubTrigger]')!.click();
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.activeElement?.id).toBe('advanced');
    });

    it('ArrowRight on the SubTrigger opens the submenu', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
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

      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(false);
    });
  });

  describe('parent navigation reaches the SubTrigger', () => {
    it('ArrowDown from the previous parent item moves to the SubTrigger', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      cut.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      expect(document.activeElement).toBe(more);
    });

    it('ArrowDown from the SubTrigger moves to the next parent item', async () => {
      const r = renderHost(SubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('paste');
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
      advanced.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
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

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
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
      advanced.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
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
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forMenuSub\] must be inside/,
      );
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
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.subOpen()).toBe(true);
      expect(document.activeElement?.id).toBe('advanced');
    });

    it('ArrowRight on the SubTrigger does NOT open the submenu in RTL', async () => {
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const more = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      more.focus();
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
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
      advanced.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
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
      advanced.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
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
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);

      // Close, flip to RTL, retry — ArrowRight should now NOT open.
      r.instance.subOpen.set(false);
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      more.focus();
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(false);

      // ArrowLeft should now open.
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
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
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);
    });

    it('ForContextMenu also exposes a dir input that propagates to its submenus', async () => {
      @Component({
        imports: [
          ForContextMenu,
          ForMenuContent,
          ForMenuItem,
          ForMenuSub,
          ForMenuSubTrigger,
        ],
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
      more.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.subOpen()).toBe(true);
    });

    it('default submenu placement flips to "left-start" in RTL', () => {
      // Inspect the directive's `placement` computed directly — independent of
      // floating-ui's async positioning, which is unreliable in jsdom.
      const r = renderHost(RtlSubMenuHost);
      r.instance.open.set(true);
      r.flush();

      const subDir = TestBed.inject(ForMenuSub, undefined, { optional: true });
      // Locate the submenu instance by querying through Angular's debug API.
      // The subOpen flag must be false here so the submenu is mounted but
      // before `injectFloating` has resolved — placement should be authored
      // from `dir` regardless.
      const subEl = document.querySelector<HTMLElement>('[forMenuSub]')!;
      // Walk to the element's directive instance via Angular debug.
      const subDebug = r.fixture.debugElement.queryAll(
        (node) => node.nativeElement === subEl,
      )[0]!;
      const sub = subDebug.injector.get(ForMenuSub);
      expect(sub.placement()).toBe('left-start');
      void subDir;
    });

    it('a consumer-provided placement overrides the RTL default (no auto-flip)', () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" dir="rtl">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub placement="top-end">
                  <button forMenuSubTrigger>More</button>
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      const subEl = document.querySelector<HTMLElement>('[forMenuSub]')!;
      const subDebug = r.fixture.debugElement.queryAll(
        (node) => node.nativeElement === subEl,
      )[0]!;
      const sub = subDebug.injector.get(ForMenuSub);
      expect(sub.placement()).toBe('top-end');
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
  });
});
