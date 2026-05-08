import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../test-utils';
import { ForMenuContent } from '../menu/menu-content';
import { ForMenuItem } from '../menu/menu-item';
import { ForMenuSub } from '../menu/menu-sub';
import { ForMenuSubTrigger } from '../menu/menu-sub-trigger';
import { ForMenubar } from './menubar';
import { ForMenubarTrigger } from './menubar-trigger';

const IMPORTS = [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem];

@Component({
  imports: IMPORTS,
  template: `
    <div
      forMenubar
      [(value)]="open"
      [orientation]="orientation()"
      [dir]="dir()"
      [loop]="loop()"
      [disabled]="disabled()"
      aria-label="Main"
    >
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="file-new" forMenuItem (select)="record('file-new')">New</button>
          <button id="file-open" forMenuItem (select)="record('file-open')">Open</button>
          <button id="file-quit" forMenuItem (select)="record('file-quit')">Quit</button>
        </div>
      }

      <button forMenubarTrigger value="edit" [disabled]="editDisabled()">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button id="edit-undo" forMenuItem>Undo</button>
          <button id="edit-redo" forMenuItem>Redo</button>
        </div>
      }

      <button forMenubarTrigger value="view">View</button>
      @if (open() === 'view') {
        <div forMenuContent>
          <button id="view-zoom" forMenuItem>Zoom</button>
        </div>
      }
    </div>
  `,
})
class MenubarHost {
  readonly open = signal<string>('');
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly loop = signal(true);
  readonly disabled = signal(false);
  readonly editDisabled = signal(false);
  readonly selects: string[] = [];
  record(id: string): void {
    this.selects.push(id);
  }
}

@Component({
  imports: [
    ForMenubar,
    ForMenubarTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forMenubar [(value)]="open">
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="new" forMenuItem>New</button>
          <div forMenuSub [(open)]="recent">
            <button id="recent" forMenuSubTrigger>Open recent</button>
            @if (recent()) {
              <div forMenuSubContent>
                <button id="recent-a" forMenuItem>a.txt</button>
                <button id="recent-b" forMenuItem>b.txt</button>
              </div>
            }
          </div>
        </div>
      }
      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button id="edit-undo" forMenuItem>Undo</button>
        </div>
      }
    </div>
  `,
})
class MenubarWithSubmenuHost {
  readonly open = signal<string>('');
  readonly recent = signal(false);
}


describe('ForMenubar', () => {
  afterEach(() => {
    document.querySelectorAll('[forMenuContent]').forEach((n) => n.remove());
    document.querySelectorAll('[forMenuSubContent]').forEach((n) => n.remove());
  });

  describe('a11y baseline', () => {
    it('reflects role="menubar", aria-orientation, data-state, dir', async () => {
      const r = renderHost(MenubarHost);
      const root = r.query<HTMLElement>('[forMenubar]')!;

      expect(root.getAttribute('role')).toBe('menubar');
      expect(root.getAttribute('aria-orientation')).toBe('horizontal');
      expect(root.getAttribute('data-orientation')).toBe('horizontal');
      expect(root.getAttribute('data-state')).toBe('closed');
      expect(root.hasAttribute('dir')).toBe(false);

      r.instance.dir.set('rtl');
      r.instance.orientation.set('vertical');
      await flush(r.fixture);

      expect(root.getAttribute('dir')).toBe('rtl');
      expect(root.getAttribute('aria-orientation')).toBe('vertical');
      expect(root.getAttribute('data-orientation')).toBe('vertical');
    });

    it('wires aria-haspopup / aria-expanded / aria-controls on each trigger', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');

      for (const t of triggers) {
        expect(t.getAttribute('role')).toBe('menuitem');
        expect(t.getAttribute('aria-haspopup')).toBe('menu');
        expect(t.getAttribute('aria-expanded')).toBe('false');
        expect(t.hasAttribute('aria-controls')).toBe(false);
      }

      r.instance.open.set('file');
      await flush(r.fixture);

      const fileTrigger = triggers.find((t) => t.textContent?.trim() === 'File')!;
      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(fileTrigger.getAttribute('aria-expanded')).toBe('true');
      expect(fileTrigger.getAttribute('aria-controls')).toBe(content.id);
      expect(fileTrigger.getAttribute('data-state')).toBe('open');
    });

    it('sets data-state="open" on root while a menu is open', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[forMenubar]')!.getAttribute('data-state')).toBe('open');
    });
  });

  describe('roving tabindex', () => {
    it('only the first enabled trigger is initially tabbable', () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      expect(triggers[0]!.getAttribute('tabindex')).toBe('0');
      expect(triggers[1]!.getAttribute('tabindex')).toBe('-1');
      expect(triggers[2]!.getAttribute('tabindex')).toBe('-1');
    });

    it('skips disabled triggers when computing the entry point', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forMenubar [(value)]="open">
            <button forMenubarTrigger value="a" disabled>A</button>
            <button forMenubarTrigger value="b">B</button>
            <button forMenubarTrigger value="c">C</button>
          </div>
        `,
      })
      class Host {
        readonly open = signal<string>('');
      }
      const r = renderHost(Host);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      expect(triggers[0]!.getAttribute('tabindex')).toBe('-1');
      expect(triggers[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('promotes the open trigger to the tab stop', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('view');
      await flush(r.fixture);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      expect(triggers[0]!.getAttribute('tabindex')).toBe('-1');
      expect(triggers[2]!.getAttribute('tabindex')).toBe('0');
    });

    it('follows focus among triggers', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[2]!.focus();
      await flush(r.fixture);
      expect(triggers[0]!.getAttribute('tabindex')).toBe('-1');
      expect(triggers[2]!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('trigger interaction', () => {
    it('opens on click and focuses the first item', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.activeElement?.id).toBe('file-new');
    });

    it('toggles closed on a second click of the same trigger', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.click();
      await flush(r.fixture);
      file.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
    });

    it('opens with last item focused on ArrowUp', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowUp');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.activeElement?.id).toBe('file-quit');
    });

    it('opens with first item focused on ArrowDown / Enter / Space', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.activeElement?.id).toBe('file-new');
    });

    it('does nothing when menubar is disabled', async () => {
      const r = renderHost(MenubarHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
    });

    it('does nothing when the trigger itself is disabled', async () => {
      const r = renderHost(MenubarHost);
      r.instance.editDisabled.set(true);
      await flush(r.fixture);
      const edit = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;
      edit.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      expect(edit.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('cross-trigger navigation (no menu open)', () => {
    it('ArrowRight moves focus to the next enabled trigger (LTR)', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush(r.fixture);
      expect(document.activeElement).toBe(triggers[1]);
    });

    it('ArrowLeft moves focus to the previous trigger (LTR), wrapping when loop', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowLeft');
      await flush(r.fixture);
      expect(document.activeElement).toBe(triggers[2]);
    });

    it('inverts ArrowLeft / ArrowRight in RTL', async () => {
      const r = renderHost(MenubarHost);
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowLeft');
      await flush(r.fixture);
      expect(document.activeElement).toBe(triggers[1]);
    });

    it('skips disabled triggers', async () => {
      const r = renderHost(MenubarHost);
      r.instance.editDisabled.set(true);
      await flush(r.fixture);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush(r.fixture);
      expect(document.activeElement).toBe(triggers[2]);
    });

    it('does not auto-open when focus moves between triggers', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
    });
  });

  describe('cross-menu navigation (menu open)', () => {
    it('ArrowRight on a top-level item closes current and opens next sibling (LTR)', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      const item = document.getElementById('file-new')!;
      item.focus();
      pressKey(item, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('edit');
      expect(document.activeElement?.id).toBe('edit-undo');
    });

    it('ArrowLeft on a top-level item opens previous sibling (LTR)', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('edit');
      await flush(r.fixture);
      const item = document.getElementById('edit-undo')!;
      item.focus();
      pressKey(item, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.activeElement?.id).toBe('file-new');
    });

    it('inverts cross-menu navigation in RTL', async () => {
      const r = renderHost(MenubarHost);
      r.instance.dir.set('rtl');
      r.instance.open.set('file');
      await flush(r.fixture);
      const item = document.getElementById('file-new')!;
      item.focus();
      // RTL: ArrowLeft is the "next" direction.
      pressKey(item, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('edit');
    });

    it('skips disabled siblings', async () => {
      const r = renderHost(MenubarHost);
      r.instance.editDisabled.set(true);
      r.instance.open.set('file');
      await flush(r.fixture);
      const item = document.getElementById('file-new')!;
      item.focus();
      pressKey(item, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('view');
    });

    it('wraps around when loop is true', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('view');
      await flush(r.fixture);
      const item = document.getElementById('view-zoom')!;
      item.focus();
      pressKey(item, 'ArrowRight');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
    });
  });

  describe('hover-after-open', () => {
    it('opens a sibling immediately on pointerenter while another menu is open', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      const view = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[2]!;
      view.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.open()).toBe('view');
    });

    it('does NOT auto-open on pointerenter while no menu is open', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
    });

    it('focuses a sibling trigger and opens its menu when one is already open', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      const edit = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;
      edit.focus();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('edit');
    });
  });

  describe('typeahead at trigger row', () => {
    it('focuses the first sibling trigger whose label starts with the buffer', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'v');
      await flush(r.fixture);
      expect(document.activeElement).toBe(triggers[2]);
    });
  });

  describe('Escape', () => {
    it('closes the open menu and returns focus to its trigger', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      const fileTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      expect(document.activeElement).toBe(fileTrigger);
    });
  });

  describe('outside dismissal', () => {
    it('closes on pointer-down outside content + every trigger', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe('');
      outside.remove();
    });

    it('does NOT close when pointer-down lands on a sibling trigger (exempt)', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      const edit = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: edit, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe('file');
    });
  });

  describe('item selection', () => {
    it('closes the menu and returns focus to the trigger after selecting', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      const item = document.getElementById('file-new')!;
      item.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      expect(r.instance.selects).toEqual(['file-new']);
      const fileTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      expect(document.activeElement).toBe(fileTrigger);
    });
  });

  describe('submenu nesting', () => {
    it('opens a submenu inside a top-level menu without switching siblings', async () => {
      const r = renderHost(MenubarWithSubmenuHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      const trigger = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      expect(trigger).not.toBeNull();
      trigger.focus();
      pressKey(trigger, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.recent()).toBe(true);
      expect(r.instance.open()).toBe('file');
    });

    it('ArrowLeft on a sub-trigger at the top of a menubar switches to previous sibling', async () => {
      const r = renderHost(MenubarWithSubmenuHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      const trigger = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
      expect(trigger).not.toBeNull();
      trigger.focus();
      // file is the first menubar trigger; loop=true makes 'prev' wrap to edit.
      pressKey(trigger, 'ArrowLeft');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('edit');
    });
  });

  describe('(valueChange) contract', () => {
    it('does not re-emit when the consumer writes via [(value)]', async () => {
      let internalEmits = 0;

      @Component({
        imports: IMPORTS,
        template: `
          <div forMenubar [(value)]="open" (valueChange)="onChange($event)">
            <button forMenubarTrigger value="a">A</button>
            @if (open() === 'a') {
              <div forMenuContent>
                <button id="a1" forMenuItem>1</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal<string>('');
        onChange(_: string): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);
      r.instance.open.set('a');
      await flush(r.fixture);
      expect(internalEmits).toBe(0);

      // Internal transition (Escape) — should fire once.
      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(internalEmits).toBe(1);
    });
  });

  describe('zoneless', () => {
    it('value / aria-expanded / data-state stay reactive without zone.js', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(MenubarHost);
      fixture.detectChanges();

      const file = fixture.nativeElement.querySelector('[forMenubarTrigger]') as HTMLButtonElement;
      const root = fixture.nativeElement.querySelector('[forMenubar]') as HTMLElement;

      fixture.componentInstance.open.set('file');
      await flush(fixture);
      expect(file.getAttribute('aria-expanded')).toBe('true');
      expect(root.getAttribute('data-state')).toBe('open');

      fixture.componentInstance.open.set('');
      await flush(fixture);
      expect(file.getAttribute('aria-expanded')).toBe('false');
      expect(root.getAttribute('data-state')).toBe('closed');
    });
  });
});
