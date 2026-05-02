import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { ForDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';
import { ForMenuCheckboxItem } from './menu-checkbox-item';
import { ForMenuContent } from './menu-content';
import { ForMenuGroup } from './menu-group';
import { ForMenuGroupLabel } from './menu-group-label';
import { ForMenuItem } from './menu-item';
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
          <button id="bold" forMenuCheckboxItem [(checked)]="bold">Bold</button>
          <button id="italic" forMenuCheckboxItem [(checked)]="italic">Italic</button>
          <hr forMenuSeparator />
          <div forMenuRadioGroup [(value)]="alignment">
            <button id="left" forMenuRadioItem value="left">Left</button>
            <button id="center" forMenuRadioItem value="center">Center</button>
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

async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('Menu items / content', () => {
  afterEach(() => {
    document.querySelectorAll('[forMenuContent]').forEach((n) => n.remove());
  });

  describe('a11y baseline', () => {
    it('sets role=menu on content and aria-labelledby to the trigger', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLElement>('[forDropdownMenuTrigger]')!;
      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;

      expect(content.getAttribute('role')).toBe('menu');
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

  describe('navigation', () => {
    it('ArrowDown moves focus to the next enabled item, skipping disabled', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const copy = document.querySelector<HTMLElement>('#copy')!;
      copy.focus();
      copy.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
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
      cut.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('right');
    });

    it('Home jumps to the first item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const right = document.querySelector<HTMLElement>('#right')!;
      right.focus();
      right.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('cut');
    });

    it('End jumps to the last enabled item', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      cut.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('right');
    });
  });

  describe('typeahead', () => {
    it('focuses the first item whose text matches the prefix', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      cut.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('italic');
    });

    it('skips disabled items during typeahead', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      cut.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
      await flush(r.fixture);

      // 'paste' is disabled — typeahead should not focus it.
      expect(document.activeElement?.id).not.toBe('paste');
    });
  });

  describe('Tab', () => {
    it('closes the menu', async () => {
      const r = renderHost(MenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      cut.focus();
      cut.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
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
        /must be used inside a \[forDropdownMenu\], \[forContextMenu\], or \[forMenuSub\]/,
      );
    });

    it('throws when [forMenuRadioItem] is used outside [forMenuRadioGroup]', () => {
      @Component({
        imports: [
          ForDropdownMenu,
          ForDropdownMenuTrigger,
          ForMenuContent,
          ForMenuRadioItem,
        ],
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
