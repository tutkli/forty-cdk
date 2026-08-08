import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { assertDataStateContract } from '../../src/test-utils/contract';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';

import { FOR_MENU_CHECKBOX_ITEM, ForMenuCheckboxItem } from './menu-checkbox-item';
import { ForMenuContent } from './menu-content';
import { ForMenuGroup } from './menu-group';
import { ForMenuGroupLabel } from './menu-group-label';
import { ForMenuItem } from './menu-item';
import { ForMenuItemIndicator } from './menu-item-indicator';
import { ForMenuRadioGroup } from './menu-radio-group';
import { FOR_MENU_RADIO_ITEM, ForMenuRadioItem } from './menu-radio-item';
import { ForMenuSeparator } from './menu-separator';

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuSeparator,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <button id="cut" forMenuItem (activate)="lastSelected.set('cut')">Cut</button>
          <button id="copy" forMenuItem (activate)="lastSelected.set('copy')">Copy</button>
          <button id="paste" forMenuItem disabled>Paste</button>
          <hr forMenuSeparator />
          <button
            id="bold"
            forMenuCheckboxItem
            [(checked)]="bold"
            (activate)="recordSelect('bold')"
          >
            Bold
          </button>
          <button id="italic" forMenuCheckboxItem [(checked)]="italic">Italic</button>
          <hr forMenuSeparator />
          <div forMenuRadioGroup [(value)]="alignment">
            <button id="left" forMenuRadioItem value="left" (activate)="recordSelect('left')">
              Left
            </button>
            <button id="center" forMenuRadioItem value="center" (activate)="recordSelect('center')">
              Center
            </button>
            <button id="right" forMenuRadioItem value="right">Right</button>
          </div>
        </div>
      }
    </div>
  `,
})
class MenuHost {
  readonly open = signal(false);
  readonly bold = signal(false);
  readonly italic = signal(false);
  readonly alignment = signal('left');
  readonly lastSelected = signal<string | null>(null);
  readonly selects: string[] = [];

  recordSelect(id: string): void {
    this.selects.push(id);
  }
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuGroup,
    ForMenuGroupLabel,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <div forMenuGroup>
            <div id="group-label" forMenuGroupLabel>File</div>
            <button id="new" forMenuItem>New</button>
            <button id="open-file" forMenuItem>Open</button>
          </div>
        </div>
      }
    </div>
  `,
})
class GroupedMenuHost {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>File</button>
      @if (open()) {
        <div forMenuContent>
          <button id="archive" forMenuItem textValue="Archive">
            <span class="badge">3</span>
            Archive
          </button>
          <button id="copy" forMenuItem>Copy</button>
          <button id="bold" forMenuCheckboxItem textValue="Bold" [(checked)]="bold">
            <span class="badge">!</span>
            Bold
          </button>
          <div forMenuRadioGroup [(value)]="alignment">
            <button id="left" forMenuRadioItem value="left" textValue="Left">
              <span class="badge">!</span>
              Left
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
class TypeaheadOverrideHost {
  readonly open = signal(true);
  readonly bold = signal(false);
  readonly alignment = signal('left');
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <button id="bold" forMenuCheckboxItem [(checked)]="bold">Bold</button>
          <button id="plain" forMenuItem>Plain</button>
        </div>
      }
    </div>
  `,
})
class CheckboxFirstHost {
  readonly open = signal(false);
  readonly bold = signal(false);
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <div forMenuRadioGroup [(value)]="alignment">
            <button id="left" forMenuRadioItem value="left">Left</button>
          </div>
          <button id="plain" forMenuItem>Plain</button>
        </div>
      }
    </div>
  `,
})
class RadioFirstHost {
  readonly open = signal(false);
  readonly alignment = signal('left');
}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuSeparator],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <hr id="sep" forMenuSeparator [orientation]="orientation()" [decorative]="decorative()" />
        </div>
      }
    </div>
  `,
})
class MenuSeparatorHost {
  readonly open = signal(true);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly decorative = signal(false);
}

describe('Menu items / content', () => {
  afterEachOverlayCleanup();

  describe('a11y baseline', () => {
    it('sets role=menu on content and aria-labelledby to the trigger', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLElement>('[forDropdownMenuTrigger]')!;
      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;

      expect(content.getAttribute('role')).toBe('menu');
      expect(content.getAttribute('aria-orientation')).toBe('vertical');
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
      expect(content.hasAttribute('aria-label')).toBe(false);
    });

    it('lets ariaLabel win over aria-labelledby when set on the root', async () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
        template: `
          <div forDropdownMenu [(open)]="open" [ariaLabel]="ariaLabel()">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <button id="cut" forMenuItem>Cut</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly ariaLabel = signal<string | null>('Actions');
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.getAttribute('aria-label')).toBe('Actions');
      expect(content.hasAttribute('aria-labelledby')).toBe(false);

      r.instance.ariaLabel.set(null);
      await flush(r.fixture);

      const trigger = r.query<HTMLElement>('[forDropdownMenuTrigger]')!;
      expect(content.hasAttribute('aria-label')).toBe(false);
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('preserves a consumer-set static aria-labelledby over the trigger fallback', async () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
        template: `
          <h2 id="heading">Document actions</h2>
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent aria-labelledby="heading">
                <button id="cut" forMenuItem>Cut</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.getAttribute('aria-labelledby')).toBe('heading');
    });

    it('sets the right role on each item type', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.querySelector('#cut')!.getAttribute('role')).toBe('menuitem');
      expect(document.querySelector('#bold')!.getAttribute('role')).toBe('menuitemcheckbox');
      expect(document.querySelector('#left')!.getAttribute('role')).toBe('menuitemradio');
      expect(document.querySelector('hr[forMenuSeparator]')!.getAttribute('role')).toBe(
        'separator',
      );
    });

    it('omits aria-orientation for the default horizontal separator and stamps data-orientation', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const sep = document.querySelector<HTMLElement>('hr[forMenuSeparator]')!;
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.hasAttribute('aria-orientation')).toBe(false);
      expect(sep.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('emits aria-orientation only for a vertical separator', async () => {
      const r = renderHost(MenuSeparatorHost);
      r.instance.orientation.set('vertical');
      await flush(r.fixture);

      const sep = document.querySelector<HTMLElement>('#sep')!;
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.getAttribute('aria-orientation')).toBe('vertical');
      expect(sep.getAttribute('data-orientation')).toBe('vertical');

      r.instance.orientation.set('horizontal');
      await flush(r.fixture);
      expect(sep.hasAttribute('aria-orientation')).toBe(false);
      expect(sep.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('switches to role=none and drops aria-orientation when decorative', async () => {
      const r = renderHost(MenuSeparatorHost);
      r.instance.decorative.set(true);
      r.instance.orientation.set('vertical');
      await flush(r.fixture);

      const sep = document.querySelector<HTMLElement>('#sep')!;
      expect(sep.getAttribute('role')).toBe('none');
      expect(sep.hasAttribute('aria-orientation')).toBe(false);
      expect(sep.getAttribute('data-orientation')).toBe('vertical');

      r.instance.decorative.set(false);
      await flush(r.fixture);
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('reflects aria-checked on checkbox items', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLElement>('#bold')!;
      expect(bold.getAttribute('aria-checked')).toBe('false');

      r.instance.bold.set(true);
      await flush(r.fixture);
      expect(bold.getAttribute('aria-checked')).toBe('true');
      expect(bold.getAttribute('data-state')).toBe('checked');
    });

    it('reflects aria-checked on the selected radio item only', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const left = document.querySelector<HTMLElement>('#left')!;
      const center = document.querySelector<HTMLElement>('#center')!;

      expect(left.getAttribute('aria-checked')).toBe('true');
      expect(center.getAttribute('aria-checked')).toBe('false');
    });

    it('marks disabled items with aria-disabled and data-disabled', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const paste = document.querySelector<HTMLElement>('#paste')!;
      expect(paste.getAttribute('aria-disabled')).toBe('true');
      expect(paste.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('item activation', () => {
    it('emits (activate) on click and closes the menu', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#cut')!.click();
      await flush(r.fixture);

      expect(r.instance.lastSelected()).toBe('cut');
      expect(r.instance.open()).toBe(false);
    });

    it('keeps the menu open when (activate) calls preventDefault', async () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <button id="keep" forMenuItem (activate)="$event.preventDefault()">Keep</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }
      const r = renderHost(Host);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#keep')!.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('disabled items are no-ops on click and do not close the menu', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#paste')!.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(r.instance.lastSelected()).toBeNull();
    });

    it('checkbox click toggles checked, then closes', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#bold')!.click();
      await flush(r.fixture);
      expect(r.instance.bold()).toBe(true);
      expect(r.instance.open()).toBe(false);

      r.instance.open.set(true);
      await flush(r.fixture);
      document.querySelector<HTMLButtonElement>('#bold')!.click();
      await flush(r.fixture);
      expect(r.instance.bold()).toBe(false);
    });

    it('radio click sets the group value to the clicked item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#center')!.click();
      await flush(r.fixture);
      expect(r.instance.alignment()).toBe('center');
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('keyboard activation (APG: Space vs Enter)', () => {
    const spaceDown = (el: HTMLElement) => {
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      return ev;
    };

    it('Space on a checkbox item toggles checked, emits (activate), and keeps the menu open', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLButtonElement>('#bold')!;
      bold.focus();
      const ev = spaceDown(bold);
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(true);
      expect(r.instance.bold()).toBe(true);
      expect(r.instance.open()).toBe(true);
      expect(r.instance.selects).toEqual(['bold']);
    });

    it('Space toggles back on each press without ever closing the menu', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLButtonElement>('#bold')!;
      bold.focus();
      spaceDown(bold);
      await flush(r.fixture);
      expect(r.instance.bold()).toBe(true);
      expect(r.instance.open()).toBe(true);

      spaceDown(bold);
      await flush(r.fixture);
      expect(r.instance.bold()).toBe(false);
      expect(r.instance.open()).toBe(true);
      expect(r.instance.selects).toEqual(['bold', 'bold']);
    });

    it('Enter on a checkbox item is not intercepted — keydown does not toggle on its own', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLButtonElement>('#bold')!;
      bold.focus();
      const ev = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      bold.dispatchEvent(ev);
      await flush(r.fixture);

      // We let the browser's native button-Enter activation flow through; we
      // do not preventDefault and do not toggle on keydown.
      expect(ev.defaultPrevented).toBe(false);
      expect(r.instance.bold()).toBe(false);
      expect(r.instance.selects).toEqual([]);
    });

    it('click on a checkbox item toggles, emits (activate), and closes (Enter follows the same path via native button activation)', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLButtonElement>('#bold')!;
      bold.click();
      await flush(r.fixture);

      expect(r.instance.bold()).toBe(true);
      expect(r.instance.open()).toBe(false);
      expect(r.instance.selects).toEqual(['bold']);
    });

    it('Space on a radio item sets the group value, emits (activate), and keeps the menu open', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const center = document.querySelector<HTMLButtonElement>('#center')!;
      center.focus();
      const ev = spaceDown(center);
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(true);
      expect(r.instance.alignment()).toBe('center');
      expect(r.instance.open()).toBe(true);
      expect(r.instance.selects).toEqual(['center']);
    });

    it('Space on a radio item already selected re-emits (activate) without closing', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const left = document.querySelector<HTMLButtonElement>('#left')!;
      left.focus();
      // 'left' is the initial value; pressing Space should still emit select
      // and stay open even though the value didn't change.
      spaceDown(left);
      await flush(r.fixture);

      expect(r.instance.alignment()).toBe('left');
      expect(r.instance.open()).toBe(true);
      expect(r.instance.selects).toEqual(['left']);
    });

    it('Enter on a radio item is not intercepted — keydown does not change the group value', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const center = document.querySelector<HTMLButtonElement>('#center')!;
      center.focus();
      const ev = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      center.dispatchEvent(ev);
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(false);
      expect(r.instance.alignment()).toBe('left');
      expect(r.instance.selects).toEqual([]);
    });

    it('click on a radio item sets the value, emits (activate), and closes', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const center = document.querySelector<HTMLButtonElement>('#center')!;
      center.click();
      await flush(r.fixture);

      expect(r.instance.alignment()).toBe('center');
      expect(r.instance.open()).toBe(false);
      expect(r.instance.selects).toEqual(['center']);
    });

    it('Space on a disabled item is a no-op (no toggle, no select)', async () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuCheckboxItem],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <button
                  id="locked"
                  forMenuCheckboxItem
                  [(checked)]="checked"
                  disabled
                  (activate)="selects.update((c) => c + 1)"
                >
                  Locked
                </button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly checked = signal(false);
        readonly selects = signal(0);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const locked = document.querySelector<HTMLButtonElement>('#locked')!;
      locked.focus();
      const ev = spaceDown(locked);
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(false);
      expect(r.instance.checked()).toBe(false);
      expect(r.instance.selects()).toBe(0);
      expect(r.instance.open()).toBe(true);
    });
  });

  // Roving navigation moves real DOM focus, so the focus *outcome*
  // (`document.activeElement`) is asserted against a real browser in
  // menu-base.e2e.ts. Here we assert the directive's wiring reaction: the
  // host-bound `data-highlighted` attribute (set by each item's own
  // focus / blur handler) lands on the item the navigate / typeahead callback
  // selected. See testing.md rule #6 (the DOM is the contract) and §E2E.
  describe('navigation', () => {
    it('ArrowDown highlights the next enabled item, skipping disabled', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      copy.focus();
      pressKey(copy, 'ArrowDown');
      await flush(r.fixture);

      // Skips disabled #paste, lands on #bold
      expect(document.querySelector('#bold')!.getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowUp wraps to the last enabled item by default (loop=true)', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'ArrowUp');
      await flush(r.fixture);

      expect(document.querySelector('#right')!.getAttribute('data-highlighted')).toBe('');
    });

    it('Home jumps to the first item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const right = document.querySelector<HTMLElement>('#right')!;
      right.focus();
      pressKey(right, 'Home');
      await flush(r.fixture);

      expect(document.querySelector('#cut')!.getAttribute('data-highlighted')).toBe('');
    });

    it('End jumps to the last enabled item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'End');
      await flush(r.fixture);

      expect(document.querySelector('#right')!.getAttribute('data-highlighted')).toBe('');
    });

    it('reflects data-highlighted on the focused item, moving with arrow nav', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      const copy = document.querySelector<HTMLElement>('#copy')!;
      cut.focus();
      await flush(r.fixture);

      expect(cut.getAttribute('data-highlighted')).toBe('');
      expect(copy.hasAttribute('data-highlighted')).toBe(false);

      pressKey(cut, 'ArrowDown');
      await flush(r.fixture);

      expect(copy.getAttribute('data-highlighted')).toBe('');
      expect(cut.hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('pointer-open highlight suppression across item flavours', () => {
    function pointerClick(el: HTMLElement): void {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.click();
    }

    it('a pointer open whose first item is a checkbox item reflects no data-highlighted', async () => {
      const r = renderHost(CheckboxFirstHost);
      pointerClick(r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.activeElement?.id).toBe('bold');
      expect(document.querySelector('[data-highlighted]')).toBeNull();

      pressKey(document.querySelector('#bold')!, 'ArrowDown');
      await flush(r.fixture);
      expect(document.querySelector('#plain')!.getAttribute('data-highlighted')).toBe('');
    });

    it('a pointer open whose first item is a radio item reflects no data-highlighted', async () => {
      const r = renderHost(RadioFirstHost);
      pointerClick(r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.activeElement?.id).toBe('left');
      expect(document.querySelector('[data-highlighted]')).toBeNull();
    });
  });

  describe('hover-follows-pointer (#662)', () => {
    function pointerMove(el: HTMLElement, pointerType?: string): void {
      const event = new PointerEvent('pointermove', { bubbles: true });
      if (pointerType !== undefined) {
        Object.defineProperty(event, 'pointerType', { value: pointerType, configurable: true });
      }
      el.dispatchEvent(event);
    }

    function pointerLeave(el: HTMLElement): void {
      el.dispatchEvent(new PointerEvent('pointerleave'));
    }

    it('pointermove over an enabled item focuses and highlights it', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      pointerMove(copy);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('copy');
      expect(copy.getAttribute('data-highlighted')).toBe('');
    });

    it('the highlight follows the pointer from item to item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      const copy = document.querySelector<HTMLElement>('#copy')!;
      pointerMove(cut);
      await flush(r.fixture);
      expect(cut.getAttribute('data-highlighted')).toBe('');

      pointerMove(copy);
      await flush(r.fixture);
      expect(copy.getAttribute('data-highlighted')).toBe('');
      expect(cut.hasAttribute('data-highlighted')).toBe(false);
    });

    it('hovering the focused-but-unhighlighted first item after a pointer open highlights it', async () => {
      const r = renderHost(MenuHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      trigger.click();
      await flush(r.fixture);

      // #655 contract: pointer open focuses the first item without highlighting it.
      expect(document.activeElement?.id).toBe('cut');
      expect(document.querySelector('[data-highlighted]')).toBeNull();

      const cut = document.querySelector<HTMLElement>('#cut')!;
      pointerMove(cut);
      await flush(r.fixture);

      // Hover is an explicit pointer intent — it highlights even the already-focused item.
      expect(cut.getAttribute('data-highlighted')).toBe('');
    });

    it('pointermove over a disabled item neither focuses nor highlights it', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const paste = document.querySelector<HTMLElement>('#paste')!;
      pointerMove(paste);
      await flush(r.fixture);

      expect(paste.hasAttribute('data-highlighted')).toBe(false);
      expect(document.activeElement?.id).not.toBe('paste');
    });

    it('a touch / pen pointermove never highlights (hover is a mouse affordance)', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      pointerMove(copy, 'touch');
      await flush(r.fixture);

      expect(copy.hasAttribute('data-highlighted')).toBe(false);
    });

    it('highlights a checkbox item on hover', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLElement>('#bold')!;
      pointerMove(bold);
      await flush(r.fixture);

      expect(bold.getAttribute('data-highlighted')).toBe('');
    });

    it('highlights a radio item on hover', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const left = document.querySelector<HTMLElement>('#left')!;
      pointerMove(left);
      await flush(r.fixture);

      expect(left.getAttribute('data-highlighted')).toBe('');
    });

    it('pointerleave on the content clears the highlight but keeps focus on the item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      pointerMove(copy);
      await flush(r.fixture);
      expect(copy.getAttribute('data-highlighted')).toBe('');

      pointerLeave(document.querySelector<HTMLElement>('[forMenuContent]')!);
      await flush(r.fixture);

      expect(copy.hasAttribute('data-highlighted')).toBe(false);
      expect(document.activeElement?.id).toBe('copy');
    });

    it('keyboard navigation still works after the pointer leaves the surface', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      pointerMove(copy);
      await flush(r.fixture);
      pointerLeave(document.querySelector<HTMLElement>('[forMenuContent]')!);
      await flush(r.fixture);

      // Focus is still anchored on #copy, so ArrowDown navigates from it
      // (skipping disabled #paste) and re-highlights the next enabled item.
      pressKey(copy, 'ArrowDown');
      await flush(r.fixture);
      expect(document.querySelector('#bold')!.getAttribute('data-highlighted')).toBe('');
      expect(copy.hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('typeahead', () => {
    it('highlights the first item whose text matches the prefix', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'i');
      await flush(r.fixture);

      expect(document.querySelector('#italic')!.getAttribute('data-highlighted')).toBe('');
    });

    it('skips disabled items during typeahead', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'p');
      await flush(r.fixture);

      // 'paste' is disabled — typeahead should not highlight it.
      expect(document.querySelector('#paste')!.hasAttribute('data-highlighted')).toBe(false);
    });

    describe('textValue override', () => {
      it('matches via textValue when item content has noise before the label', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        // The item's textContent starts with '3' (a badge), so the legacy
        // textContent-based prefix match would not catch 'a'. Override fixes it.
        archive.focus();
        pressKey(archive, 'a');
        await flush(r.fixture);

        expect(archive.getAttribute('data-highlighted')).toBe('');
      });

      it('falls back to textContent when textValue is empty', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        archive.focus();
        pressKey(archive, 'c');
        await flush(r.fixture);

        // 'copy' has no textValue and a clean textContent — fallback path.
        expect(document.querySelector('#copy')!.getAttribute('data-highlighted')).toBe('');
      });

      it('applies the textValue override to ForMenuCheckboxItem', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        archive.focus();
        pressKey(archive, 'b');
        await flush(r.fixture);

        expect(document.querySelector('#bold')!.getAttribute('data-highlighted')).toBe('');
      });

      it('applies the textValue override to ForMenuRadioItem', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        archive.focus();
        pressKey(archive, 'l');
        await flush(r.fixture);

        expect(document.querySelector('#left')!.getAttribute('data-highlighted')).toBe('');
      });
    });
  });

  describe('Space mid-typeahead never activates the focused item', () => {
    it('a plain item leaves an empty-buffer Space free to activate natively', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLButtonElement>('#cut')!;
      cut.focus();
      const ev = pressKey(cut, ' ');
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(false);
    });

    it('a plain item suppresses a Space consumed mid-typeahead', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLButtonElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'z');
      await flush(r.fixture);

      const ev = pressKey(cut, ' ');
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe(true);
      expect(r.instance.lastSelected()).toBeNull();
    });

    it('a checkbox item does not toggle on a Space consumed mid-typeahead', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const bold = document.querySelector<HTMLButtonElement>('#bold')!;
      bold.focus();
      pressKey(bold, 'z');
      await flush(r.fixture);

      const ev = pressKey(bold, ' ');
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(true);
      expect(r.instance.bold()).toBe(false);
      expect(r.instance.open()).toBe(true);
      expect(r.instance.selects).toEqual([]);
    });

    it('a radio item does not change the group value on a Space consumed mid-typeahead', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const right = document.querySelector<HTMLButtonElement>('#right')!;
      right.focus();
      pressKey(right, 'z');
      await flush(r.fixture);

      const ev = pressKey(right, ' ');
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(true);
      expect(r.instance.alignment()).toBe('left');
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('Tab', () => {
    it('closes the menu', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'Tab');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });
  });

  describe('groups', () => {
    it('wires aria-labelledby on the group to the group label id', async () => {
      const r = renderHost(GroupedMenuHost);
      await flush(r.fixture);

      const group = document.querySelector<HTMLElement>('[forMenuGroup]')!;
      const label = document.querySelector<HTMLElement>('[forMenuGroupLabel]')!;

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('wires aria-labelledby on a radio group to a projected group label', async () => {
      @Component({
        imports: [
          ForDropdownMenu,
          ForDropdownMenuTrigger,
          ForMenuContent,
          ForMenuRadioGroup,
          ForMenuRadioItem,
          ForMenuGroupLabel,
        ],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>Sort</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuRadioGroup [(value)]="sort">
                  <div forMenuGroupLabel>Sort by</div>
                  <button id="name" forMenuRadioItem value="name">Name</button>
                  <button id="date" forMenuRadioItem value="date">Date</button>
                </div>
              </div>
            }
          </div>
        `,
      })
      class RadioGroupLabelHost {
        readonly open = signal(true);
        readonly sort = signal('name');
      }

      const r = renderHost(RadioGroupLabelHost);
      await flush(r.fixture);

      const group = document.querySelector<HTMLElement>('[forMenuRadioGroup]')!;
      const label = document.querySelector<HTMLElement>('[forMenuGroupLabel]')!;

      expect(group.getAttribute('role')).toBe('group');
      expect(label.id).toBeTruthy();
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(document.getElementById(label.id)).toBe(label);
    });

    it('omits aria-labelledby on a radio group with no projected label', async () => {
      @Component({
        imports: [
          ForDropdownMenu,
          ForDropdownMenuTrigger,
          ForMenuContent,
          ForMenuRadioGroup,
          ForMenuRadioItem,
        ],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>Sort</button>
            @if (open()) {
              <div forMenuContent>
                <div forMenuRadioGroup [(value)]="sort">
                  <button id="name" forMenuRadioItem value="name">Name</button>
                </div>
              </div>
            }
          </div>
        `,
      })
      class RadioGroupNoLabelHost {
        readonly open = signal(true);
        readonly sort = signal('name');
      }

      const r = renderHost(RadioGroupNoLabelHost);
      await flush(r.fixture);

      const group = document.querySelector<HTMLElement>('[forMenuRadioGroup]')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('orphan errors', () => {
    it('throws when [forMenuItem] is used without a menu root', () => {
      @Component({
        imports: [ForMenuItem],
        template: `<button forMenuItem>orphan</button>`,
      })
      class OrphanItem {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => TestBed.createComponent(OrphanItem)).toThrow(
        /must be used inside a \[forMenu\], \[forDropdownMenu\], \[forContextMenu\], \[forMenubar\], or \[forMenuSub\]/,
      );
    });

    it('throws when [forMenuRadioItem] is used outside [forMenuRadioGroup]', () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuRadioItem],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <button forMenuRadioItem value="x">orphan radio</button>
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
      expect(() => fixture.detectChanges()).toThrow(/must be used inside a \[forMenuRadioGroup\]/);
    });

    it('throws when [forMenuGroupLabel] is used outside [forMenuGroup]', () => {
      @Component({
        imports: [ForMenuGroupLabel],
        template: `<div forMenuGroupLabel>orphan</div>`,
      })
      class OrphanLabel {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => TestBed.createComponent(OrphanLabel)).toThrow(
        /must be used inside a \[forMenuGroup\]/,
      );
    });
  });

  describe('reactive updates', () => {
    it('reflects checkbox and radio item writes in data-state and aria-checked', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.bold.set(true);
      await flush(r.fixture);
      const bold = document.querySelector<HTMLElement>('#bold')!;
      expect(bold.getAttribute('data-state')).toBe('checked');

      r.instance.alignment.set('center');
      await flush(r.fixture);
      const center = document.querySelector<HTMLElement>('#center')!;
      expect(center.getAttribute('aria-checked')).toBe('true');
    });
  });
});

describe('ForMenuItemIndicator', () => {
  afterEachOverlayCleanup();

  @Component({
    imports: [
      ForDropdownMenu,
      ForDropdownMenuTrigger,
      ForMenuContent,
      ForMenuCheckboxItem,
      ForMenuRadioGroup,
      ForMenuRadioItem,
      ForMenuItemIndicator,
    ],
    template: `
      <div forDropdownMenu [(open)]="open">
        <button forDropdownMenuTrigger>Format</button>
        @if (open()) {
          <div forMenuContent>
            <button id="bold" forMenuCheckboxItem [(checked)]="bold">
              <span data-test-id="bold-ind" forMenuItemIndicator>✓</span>
              Bold
            </button>
            <button id="italic" forMenuCheckboxItem [(checked)]="italic">
              <span data-test-id="italic-ind" forMenuItemIndicator [forceMount]="forceMount()"
                >✓</span
              >
              Italic
            </button>
            <div forMenuRadioGroup [(value)]="alignment">
              <button id="left" forMenuRadioItem value="left">
                <span data-test-id="left-ind" forMenuItemIndicator>•</span>
                Left
              </button>
              <button id="right" forMenuRadioItem value="right">
                <span data-test-id="right-ind" forMenuItemIndicator>•</span>
                Right
              </button>
            </div>
          </div>
        }
      </div>
    `,
  })
  class IndicatorHost {
    readonly open = signal(true);
    readonly bold = signal(false);
    readonly italic = signal(false);
    readonly alignment = signal('left');
    readonly forceMount = signal(false);
  }

  function indicator(testId: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);
    if (!el) {
      throw new Error(`Indicator [data-test-id="${testId}"] not found.`);
    }
    return el;
  }

  assertDataStateContract({
    vocabulary: ['checked', 'unchecked'],
    mount: () => {
      const r = renderHost(IndicatorHost);
      return {
        pieces: () => ({
          checkboxItem: document.querySelector<HTMLElement>('#bold'),
          indicator: document.querySelector<HTMLElement>('[data-test-id="bold-ind"]'),
        }),
        setState: (state) => r.instance.bold.set(state === 'checked'),
        flush: r.flush,
      };
    },
  });

  it('hides while the checkbox item is unchecked and shows when checked', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('bold-ind').hasAttribute('hidden')).toBe(true);

    r.instance.bold.set(true);
    await flush(r.fixture);

    expect(indicator('bold-ind').hasAttribute('hidden')).toBe(false);
  });

  it('reflects the radio group value across siblings', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('left-ind').hasAttribute('hidden')).toBe(false);
    expect(indicator('left-ind').getAttribute('data-state')).toBe('checked');
    expect(indicator('right-ind').hasAttribute('hidden')).toBe(true);
    expect(indicator('right-ind').getAttribute('data-state')).toBe('unchecked');

    r.instance.alignment.set('right');
    await flush(r.fixture);

    expect(indicator('left-ind').hasAttribute('hidden')).toBe(true);
    expect(indicator('right-ind').hasAttribute('hidden')).toBe(false);
  });

  it('keeps the indicator mounted when forceMount=true', async () => {
    const r = renderHost(IndicatorHost);
    r.instance.forceMount.set(true);
    await flush(r.fixture);

    expect(indicator('italic-ind').hasAttribute('hidden')).toBe(false);
    expect(indicator('italic-ind').getAttribute('data-state')).toBe('unchecked');
  });

  it('enforces inline display:none while unchecked so a consumer display class cannot leak through', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('bold-ind').style.display).toBe('none');

    r.instance.bold.set(true);
    await flush(r.fixture);
    expect(indicator('bold-ind').style.display).toBe('');
  });

  it('clears inline display:none while unchecked when forceMount=true', async () => {
    const r = renderHost(IndicatorHost);
    r.instance.forceMount.set(true);
    await flush(r.fixture);

    expect(indicator('italic-ind').style.display).toBe('');
  });

  it('throws when used outside a checkable menu item', () => {
    @Component({
      imports: [ForMenuItemIndicator],
      template: `<span forMenuItemIndicator></span>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/menu\] FORCDK-MENU-003: ForMenuItemIndicator must be used inside a \[forMenuCheckboxItem\] or \[forMenuRadioItem\] element\./,
    );
  });

  it('resolves a subclassed checkbox item via the re-provided FOR_MENU_CHECKBOX_ITEM token', async () => {
    @Directive({
      selector: '[testMenuCheckboxItem]',
      providers: [{ provide: FOR_MENU_CHECKBOX_ITEM, useExisting: TestMenuCheckboxItem }],
    })
    class TestMenuCheckboxItem extends ForMenuCheckboxItem {}

    @Component({
      imports: [
        ForDropdownMenu,
        ForDropdownMenuTrigger,
        ForMenuContent,
        TestMenuCheckboxItem,
        ForMenuItemIndicator,
      ],
      template: `
        <div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger>Format</button>
          @if (open()) {
            <div forMenuContent>
              <button id="bold" testMenuCheckboxItem [(checked)]="bold">
                <span data-test-id="bold-ind" forMenuItemIndicator>✓</span>
                Bold
              </button>
            </div>
          }
        </div>
      `,
    })
    class SubclassHost {
      readonly open = signal(true);
      readonly bold = signal(true);
    }

    const r = renderHost(SubclassHost);
    await flush(r.fixture);
    expect(indicator('bold-ind').getAttribute('data-state')).toBe('checked');
  });

  it('resolves a subclassed radio item via the re-provided FOR_MENU_RADIO_ITEM token', async () => {
    @Directive({
      selector: '[testMenuRadioItem]',
      providers: [{ provide: FOR_MENU_RADIO_ITEM, useExisting: TestMenuRadioItem }],
    })
    class TestMenuRadioItem extends ForMenuRadioItem {}

    @Component({
      imports: [
        ForDropdownMenu,
        ForDropdownMenuTrigger,
        ForMenuContent,
        ForMenuRadioGroup,
        TestMenuRadioItem,
        ForMenuItemIndicator,
      ],
      template: `
        <div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger>Align</button>
          @if (open()) {
            <div forMenuContent>
              <div forMenuRadioGroup [(value)]="alignment">
                <button id="left" testMenuRadioItem value="left">
                  <span data-test-id="left-ind" forMenuItemIndicator>•</span>
                  Left
                </button>
              </div>
            </div>
          }
        </div>
      `,
    })
    class SubclassHost {
      readonly open = signal(true);
      readonly alignment = signal('left');
    }

    const r = renderHost(SubclassHost);
    await flush(r.fixture);
    expect(indicator('left-ind').getAttribute('data-state')).toBe('checked');
  });

  describe('reactive updates', () => {
    it('flips indicator visibility on a parent state change', async () => {
      const r = renderHost(IndicatorHost);
      await flush(r.fixture);

      expect(indicator('bold-ind').hasAttribute('hidden')).toBe(true);
      r.instance.bold.set(true);
      await flush(r.fixture);
      expect(indicator('bold-ind').hasAttribute('hidden')).toBe(false);
    });
  });
});
