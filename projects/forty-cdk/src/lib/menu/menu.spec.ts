import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../test-utils';
import { ForDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { ForDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';
import { ForMenuCheckboxItem } from './menu-checkbox-item';
import { ForMenuContent } from './menu-content';
import { ForMenuGroup } from './menu-group';
import { ForMenuGroupLabel } from './menu-group-label';
import { ForMenuItem } from './menu-item';
import { ForMenuItemIndicator } from './menu-item-indicator';
import { ForMenuRadioGroup } from './menu-radio-group';
import { ForMenuRadioItem } from './menu-radio-item';
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
          <button id="cut" forMenuItem (select)="lastSelected.set('cut')">Cut</button>
          <button id="copy" forMenuItem (select)="lastSelected.set('copy')">Copy</button>
          <button id="paste" forMenuItem disabled>Paste</button>
          <hr forMenuSeparator />
          <button id="bold" forMenuCheckboxItem [(checked)]="bold" (select)="recordSelect('bold')">
            Bold
          </button>
          <button id="italic" forMenuCheckboxItem [(checked)]="italic">Italic</button>
          <hr forMenuSeparator />
          <div forMenuRadioGroup [(value)]="alignment">
            <button id="left" forMenuRadioItem value="left" (select)="recordSelect('left')">
              Left
            </button>
            <button id="center" forMenuRadioItem value="center" (select)="recordSelect('center')">
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
    it('emits (select) on click and closes the menu', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#cut')!.click();
      await flush(r.fixture);

      expect(r.instance.lastSelected()).toBe('cut');
      expect(r.instance.open()).toBe(false);
    });

    it('keeps the menu open when (select) calls preventDefault', async () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
        template: `
          <div forDropdownMenu [(open)]="open">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <button id="keep" forMenuItem (select)="$event.preventDefault()">Keep</button>
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

    it('Space on a checkbox item toggles checked, emits (select), and keeps the menu open', async () => {
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

    it('click on a checkbox item toggles, emits (select), and closes (Enter follows the same path via native button activation)', async () => {
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

    it('Space on a radio item sets the group value, emits (select), and keeps the menu open', async () => {
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

    it('Space on a radio item already selected re-emits (select) without closing', async () => {
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

    it('click on a radio item sets the value, emits (select), and closes', async () => {
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
                  (select)="selects.update((c) => c + 1)"
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

  describe('navigation', () => {
    it('ArrowDown moves focus to the next enabled item, skipping disabled', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      copy.focus();
      pressKey(copy, 'ArrowDown');
      await flush(r.fixture);

      // Skips disabled #paste, lands on #bold
      expect(document.activeElement?.id).toBe('bold');
    });

    it('ArrowUp wraps to the last enabled item by default (loop=true)', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'ArrowUp');
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('right');
    });

    it('Home jumps to the first item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const right = document.querySelector<HTMLElement>('#right')!;
      right.focus();
      pressKey(right, 'Home');
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('cut');
    });

    it('End jumps to the last enabled item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'End');
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('right');
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

      expect(document.activeElement?.id).toBe('copy');
      expect(copy.getAttribute('data-highlighted')).toBe('');
      expect(cut.hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('typeahead', () => {
    it('focuses the first item whose text matches the prefix', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'i');
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('italic');
    });

    it('skips disabled items during typeahead', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      pressKey(cut, 'p');
      await flush(r.fixture);

      // 'paste' is disabled — typeahead should not focus it.
      expect(document.activeElement?.id).not.toBe('paste');
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

        expect(document.activeElement?.id).toBe('archive');
      });

      it('falls back to textContent when textValue is empty', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        archive.focus();
        pressKey(archive, 'c');
        await flush(r.fixture);

        // 'copy' has no textValue and a clean textContent — fallback path.
        expect(document.activeElement?.id).toBe('copy');
      });

      it('applies the textValue override to ForMenuCheckboxItem', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        archive.focus();
        pressKey(archive, 'b');
        await flush(r.fixture);

        expect(document.activeElement?.id).toBe('bold');
      });

      it('applies the textValue override to ForMenuRadioItem', async () => {
        const r = renderHost(TypeaheadOverrideHost);
        await flush(r.fixture);

        const archive = document.querySelector<HTMLElement>('#archive')!;
        archive.focus();
        pressKey(archive, 'l');
        await flush(r.fixture);

        expect(document.activeElement?.id).toBe('left');
      });
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
        /must be used inside a \[forDropdownMenu\], \[forContextMenu\], \[forMenubar\], or \[forMenuSub\]/,
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

  describe('zoneless', () => {
    it('item state stays reactive without zone.js', async () => {
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

  it('hides while the checkbox item is unchecked and shows when checked', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('bold-ind').hasAttribute('hidden')).toBe(true);
    expect(indicator('bold-ind').getAttribute('data-state')).toBe('unchecked');

    r.instance.bold.set(true);
    await flush(r.fixture);

    expect(indicator('bold-ind').hasAttribute('hidden')).toBe(false);
    expect(indicator('bold-ind').getAttribute('data-state')).toBe('checked');
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

  it('throws when used outside a checkable menu item', () => {
    @Component({
      imports: [ForMenuItemIndicator],
      template: `<span forMenuItemIndicator></span>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/menu\] ForMenuItemIndicator must be used inside a \[forMenuCheckboxItem\] or \[forMenuRadioItem\] element\./,
    );
  });

  describe('zoneless reactivity', () => {
    it('flips visibility on parent state change without Zone.js', async () => {
      const r = renderHost(IndicatorHost);
      await flush(r.fixture);

      expect(indicator('bold-ind').hasAttribute('hidden')).toBe(true);
      r.instance.bold.set(true);
      await flush(r.fixture);
      expect(indicator('bold-ind').hasAttribute('hidden')).toBe(false);
    });
  });
});
