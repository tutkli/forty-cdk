import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { assertRovingTabindexContract } from '../../src/test-utils/contract';
import type { VetoableEvent, VetoableNativeEvent } from 'forty-cdk/core';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';

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
      [dismissible]="dismissible()"
      aria-label="Main"
    >
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="file-new" forMenuItem (activate)="record('file-new')">New</button>
          <button id="file-open" forMenuItem (activate)="record('file-open')">Open</button>
          <button id="file-quit" forMenuItem (activate)="record('file-quit')">Quit</button>
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
  readonly dismissible = signal(true);
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
    <div forMenubar [(value)]="open" [dir]="dir()">
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <div forMenuSub [(open)]="recent">
            <button id="nested-recent" forMenuSubTrigger>Open recent</button>
            @if (recent()) {
              <div forMenuSubContent>
                <button id="nested-a" forMenuItem>a.txt</button>
                <div forMenuSub [(open)]="deep">
                  <button id="nested-more" forMenuSubTrigger>More</button>
                  @if (deep()) {
                    <div forMenuSubContent>
                      <button id="nested-deep" forMenuItem>deep.txt</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button id="nested-edit-undo" forMenuItem>Undo</button>
        </div>
      }
    </div>
  `,
})
class MenubarNestedSubmenuHost {
  readonly open = signal<string>('');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly recent = signal(false);
  readonly deep = signal(false);
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger],
  template: `
    <div forMenubar [(value)]="open">
      <button forMenubarTrigger value="file">File</button>
      <button forMenubarTrigger value="format">Format</button>
      <button forMenubarTrigger value="edit">Edit</button>
    </div>
  `,
})
class MenubarTypeaheadHost {
  readonly open = signal<string>('');
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger],
  template: `
    <div forMenubar [(value)]="open" [orientation]="orientation()" [dir]="dir()">
      @for (t of triggers(); track t.value) {
        <button forMenubarTrigger [value]="t.value" [disabled]="t.disabled">{{ t.label }}</button>
      }
    </div>
  `,
})
class MenubarRovingHost {
  readonly open = signal<string>('');
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly triggers = signal([
    { value: 'file', label: 'File', disabled: false },
    { value: 'edit', label: 'Edit', disabled: false },
    { value: 'view', label: 'View', disabled: false },
  ]);
}

@Component({
  imports: IMPORTS,
  template: `
    <div forMenubar [(value)]="open">
      <button forMenubarTrigger value="file" id="file-trigger">File</button>
      @if (open() === 'file') {
        <div forMenuContent id="file-menu">
          <button forMenuItem>New</button>
        </div>
      }

      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button forMenuItem>Undo</button>
        </div>
      }
    </div>
  `,
})
class MenubarStaticIdHost {
  readonly open = signal<string>('');
}

@Component({
  imports: IMPORTS,
  template: `
    <div forMenubar [(value)]="open">
      <button forMenubarTrigger value="file" id="file-trigger">File</button>
      <div forMenuContent id="always-mounted">
        <button forMenuItem>New</button>
      </div>
    </div>
  `,
})
class MenubarAlwaysMountedContentHost {
  readonly open = signal<string>('');
}

type MenubarVetoChannel =
  | 'none'
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'interactOutside'
  | 'autoFocusOnOpen'
  | 'autoFocusOnClose';

@Component({
  imports: IMPORTS,
  template: `
    <div
      forMenubar
      [(value)]="open"
      [dismissible]="dismissible()"
      (escapeKeyDown)="onEscape($event)"
      (pointerDownOutside)="onPointerDownOutside($event)"
      (focusOutside)="onFocusOutside($event)"
      (interactOutside)="onInteractOutside($event)"
      (autoFocusOnOpen)="onAutoFocusOnOpen($event)"
      (autoFocusOnClose)="onAutoFocusOnClose($event)"
    >
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="file-new" forMenuItem>New</button>
          <button id="file-open" forMenuItem>Open</button>
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
class MenubarOutputsHost {
  readonly open = signal<string>('');
  readonly dismissible = signal(true);
  readonly veto = signal<MenubarVetoChannel>('none');

  escapeCount = 0;
  pointerDownOutsideCount = 0;
  focusOutsideCount = 0;
  interactOutsideCount = 0;
  autoFocusOnOpenCount = 0;
  autoFocusOnCloseCount = 0;
  lastEscapeEvent: KeyboardEvent | null = null;
  lastOutsideEvents: Event[] = [];

  onEscape(e: VetoableNativeEvent<KeyboardEvent>): void {
    this.escapeCount++;
    this.lastEscapeEvent = e.event;
    if (this.veto() === 'escape') e.preventDefault();
  }
  onPointerDownOutside(e: VetoableNativeEvent<PointerEvent>): void {
    this.pointerDownOutsideCount++;
    this.lastOutsideEvents.push(e.event);
    if (this.veto() === 'pointerDownOutside') e.preventDefault();
  }
  onFocusOutside(e: VetoableNativeEvent<FocusEvent>): void {
    this.focusOutsideCount++;
    this.lastOutsideEvents.push(e.event);
    if (this.veto() === 'focusOutside') e.preventDefault();
  }
  onInteractOutside(e: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.interactOutsideCount++;
    this.lastOutsideEvents.push(e.event);
    if (this.veto() === 'interactOutside') e.preventDefault();
  }
  onAutoFocusOnOpen(e: VetoableEvent): void {
    this.autoFocusOnOpenCount++;
    if (this.veto() === 'autoFocusOnOpen') e.preventDefault();
  }
  onAutoFocusOnClose(e: VetoableEvent): void {
    this.autoFocusOnCloseCount++;
    if (this.veto() === 'autoFocusOnClose') e.preventDefault();
  }
}

const menubarTriggers = (host: HTMLElement): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>('[forMenubarTrigger]'));

/**
 * Builds a mouse pointer event. jsdom's `PointerEvent` constructor doesn't
 * populate `pointerType` from its init dict, so the spec defines it directly.
 */
function pointerEvent(type: 'pointerenter' | 'pointerleave'): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperty(event, 'pointerType', { value: 'mouse', configurable: true });
  return event;
}

function outsidePointerDown(target: Node): PointerEvent {
  const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  Object.defineProperty(event, 'composedPath', { value: () => [target], configurable: true });
  return event;
}

function outsideFocusIn(target: Node): FocusEvent {
  const event = new FocusEvent('focusin', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  Object.defineProperty(event, 'composedPath', { value: () => [target], configurable: true });
  return event;
}

describe('ForMenubar', () => {
  afterEachOverlayCleanup();

  assertRovingTabindexContract(
    {
      mount: async () => {
        const r = renderHost(MenubarRovingHost);
        await r.flush();
        return { items: menubarTriggers(r.el), flush: r.flush };
      },
      mountWithDisabledFirst: async () => {
        const r = renderHost(MenubarRovingHost);
        r.instance.triggers.set([
          { value: 'file', label: 'File', disabled: true },
          { value: 'edit', label: 'Edit', disabled: false },
          { value: 'view', label: 'View', disabled: false },
        ]);
        await r.flush();
        return { items: menubarTriggers(r.el), enabledIndices: [1, 2], flush: r.flush };
      },
      mountWithDisabledMiddle: async () => {
        const r = renderHost(MenubarRovingHost);
        r.instance.triggers.set([
          { value: 'file', label: 'File', disabled: false },
          { value: 'edit', label: 'Edit', disabled: true },
          { value: 'view', label: 'View', disabled: false },
        ]);
        await r.flush();
        return { items: menubarTriggers(r.el), enabledIndices: [0, 2], flush: r.flush };
      },
      mountRtl: async () => {
        const r = renderHost(MenubarRovingHost);
        r.instance.dir.set('rtl');
        await r.flush();
        return { items: menubarTriggers(r.el), flush: r.flush };
      },
    },
    { forwardArrow: 'ArrowRight' },
  );

  describe('a11y baseline', () => {
    it('reflects role="menubar", aria-orientation, data-state, dir', async () => {
      const r = renderHost(MenubarHost);
      const root = r.query<HTMLElement>('[forMenubar]')!;

      expect(root.getAttribute('role')).toBe('menubar');
      expect(root.getAttribute('aria-orientation')).toBe('horizontal');
      expect(root.getAttribute('data-orientation')).toBe('horizontal');
      expect(root.getAttribute('data-state')).toBe('closed');
      expect(root.getAttribute('dir')).toBe('ltr');

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

  describe('consumer static id (#659)', () => {
    it('adopts a static id on the mounted [forMenuContent] and keeps the aria pairing', async () => {
      const r = renderHost(MenubarStaticIdHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      const fileTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;

      expect(content.id).toBe('file-menu');
      expect(fileTrigger.id).toBe('file-trigger');
      expect(fileTrigger.getAttribute('aria-controls')).toBe('file-menu');
      expect(content.getAttribute('aria-labelledby')).toBe('file-trigger');
    });

    it('falls back to a generated content id when the content host has none', async () => {
      const r = renderHost(MenubarStaticIdHost);
      r.instance.open.set('edit');
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      const editTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;

      expect(content.id).toMatch(/^for-menubar-content-/);
      expect(editTrigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('adoption is per trigger — switching menus does not leak the adopted id', async () => {
      const r = renderHost(MenubarStaticIdHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('[forMenuContent]')!.id).toBe('file-menu');

      r.instance.open.set('edit');
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.id).not.toBe('file-menu');
      expect(content.id).toMatch(/^for-menubar-content-/);
    });

    it('content mounted while no trigger is active still wires aria on the next activation', async () => {
      const r = renderHost(MenubarAlwaysMountedContentHost);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.id).toBe('');

      r.instance.open.set('file');
      await flush(r.fixture);

      const fileTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      expect(content.id).toMatch(/^for-menubar-content-/);
      expect(fileTrigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe('file-trigger');
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

    it('skips disabled triggers when computing the entry point', () => {
      @Component({
        imports: [ForMenubar, ForMenubarTrigger],
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

  // Cross-layer focus moves — the focused item after a menu opens, the focused
  // trigger after cross-trigger / cross-menu navigation, and return-focus on
  // close — are focus outcomes jsdom mis-models; they are asserted against a
  // real browser in menubar.e2e.ts. The Vitest layer asserts the wiring: the
  // `value` (open) signal, the roving `tabindex` host binding that follows
  // focus among triggers, and the items' `data-highlighted` reaction. See
  // testing.md rule #6 and §E2E.
  describe('trigger interaction', () => {
    it('opens on keyboard-style click (no preceding pointerdown) and highlights the first item', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');
    });

    it('opens on pointer click without highlighting the first item', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      file.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.querySelector('[data-highlighted]')).toBeNull();
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

    it('opens with the last item highlighted on ArrowUp', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowUp');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.querySelector('#file-quit')!.getAttribute('data-highlighted')).toBe('');
    });

    it('opens with the first item highlighted on ArrowDown / Enter / Space', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');
    });

    it('moves focus to the first item when an open key is pressed on an already-open trigger', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');

      file.focus();
      await flush(r.fixture);
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBeNull();

      pressKey(file, 'Enter');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.activeElement?.id).toBe('file-new');
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');
    });

    it('moves focus to the last item on ArrowUp over an already-open trigger', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowDown');
      await flush(r.fixture);
      file.focus();
      await flush(r.fixture);

      pressKey(file, 'ArrowUp');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
      expect(document.activeElement?.id).toBe('file-quit');
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
    it('ArrowRight promotes the next enabled trigger to the tab stop (LTR)', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush(r.fixture);
      expect(triggers[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowLeft promotes the previous trigger to the tab stop (LTR), wrapping when loop', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowLeft');
      await flush(r.fixture);
      expect(triggers[2]!.getAttribute('tabindex')).toBe('0');
    });

    it('inverts ArrowLeft / ArrowRight in RTL', async () => {
      const r = renderHost(MenubarHost);
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowLeft');
      await flush(r.fixture);
      expect(triggers[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('skips disabled triggers', async () => {
      const r = renderHost(MenubarHost);
      r.instance.editDisabled.set(true);
      await flush(r.fixture);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowRight');
      await flush(r.fixture);
      expect(triggers[2]!.getAttribute('tabindex')).toBe('0');
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
      expect(document.querySelector('#edit-undo')!.getAttribute('data-highlighted')).toBe('');
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
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');
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

    it('hover-switch opens the sibling without highlighting its first item', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowDown');
      await flush(r.fixture);
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');

      const view = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[2]!;
      view.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.open()).toBe('view');
      expect(document.querySelector('[data-highlighted]')).toBeNull();
    });

    it('does NOT auto-open on pointerenter while no menu is open', async () => {
      const r = renderHost(MenubarHost);
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
    });

    it('does NOT open a sibling on focus alone while a menu is open (focus is not hover)', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      const edit = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;
      edit.focus();
      await flush(r.fixture);
      // Keyboard focus traversal must not force-open a sibling; only hover
      // (pointerenter) switches the open menu (see issue #504).
      expect(r.instance.open()).toBe('file');
    });
  });

  describe('typeahead at trigger row', () => {
    it('promotes the first sibling trigger whose label starts with the buffer', async () => {
      const r = renderHost(MenubarHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'v');
      await flush(r.fixture);
      expect(triggers[2]!.getAttribute('tabindex')).toBe('0');
    });

    it('anchors on the focused trigger and cycles past it to the next same-initial sibling', async () => {
      const r = renderHost(MenubarTypeaheadHost);
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();

      pressKey(triggers[0]!, 'f');
      await flush(r.fixture);
      expect(triggers[1]!.getAttribute('tabindex')).toBe('0');

      pressKey(triggers[1]!, 'f');
      await flush(r.fixture);
      expect(triggers[0]!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('vertical orientation', () => {
    async function renderVertical(dir: 'ltr' | 'rtl' = 'ltr') {
      const r = renderHost(MenubarHost);
      r.instance.orientation.set('vertical');
      r.instance.dir.set(dir);
      await flush(r.fixture);
      return r;
    }

    it('ArrowDown moves focus to the next trigger without opening a menu', async () => {
      const r = await renderVertical();
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      expect(triggers[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowUp moves focus to the previous trigger, wrapping with loop', async () => {
      const r = await renderVertical();
      const triggers = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]');
      triggers[0]!.focus();
      pressKey(triggers[0]!, 'ArrowUp');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      expect(triggers[2]!.getAttribute('tabindex')).toBe('0');
    });

    it('ArrowRight opens the focused trigger on the first item (LTR)', async () => {
      const r = await renderVertical();
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      const event = pressKey(file, 'ArrowRight');
      await flush(r.fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe('file');
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowLeft does not open a menu (LTR)', async () => {
      const r = await renderVertical();
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'ArrowLeft');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
    });

    it('ArrowLeft opens the focused trigger on the first item (RTL)', async () => {
      const r = await renderVertical('rtl');
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      const event = pressKey(file, 'ArrowLeft');
      await flush(r.fixture);
      expect(event.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe('file');
      expect(document.querySelector('#file-new')!.getAttribute('data-highlighted')).toBe('');
    });

    it('Enter opens the focused trigger regardless of orientation', async () => {
      const r = await renderVertical();
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, 'Enter');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
    });

    it('Space opens the focused trigger regardless of orientation', async () => {
      const r = await renderVertical();
      const file = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(file, ' ');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('file');
    });
  });

  describe('Escape', () => {
    it('closes the open menu and promotes its trigger back to the tab stop', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      // Return-focus to the trigger is asserted in a real browser
      // (menubar.e2e.ts); here we assert the roving wiring reaction — the
      // closing trigger regains the single tab stop.
      const fileTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      expect(fileTrigger.getAttribute('tabindex')).toBe('0');
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
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [edit], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe('file');
    });
  });

  describe('dismissible', () => {
    it('[dismissible]="false" keeps the menu open on Escape', async () => {
      const r = renderHost(MenubarHost);
      r.instance.dismissible.set(false);
      r.instance.open.set('file');
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('file');
    });

    it('[dismissible]="false" keeps the menu open on outside pointer-down', async () => {
      const r = renderHost(MenubarHost);
      r.instance.dismissible.set(false);
      r.instance.open.set('file');
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe('file');
      outside.remove();
    });

    it('still closes on Escape / outside when dismissible (default) is true', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('');
    });
  });

  describe('shell contract outputs (parity with the menu roots)', () => {
    let outside: HTMLButtonElement | null = null;

    afterEach(() => {
      outside?.remove();
      outside = null;
    });

    function appendOutside(): HTMLButtonElement {
      outside = document.createElement('button');
      document.body.appendChild(outside);
      return outside;
    }

    async function openFile() {
      const r = renderHost(MenubarOutputsHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      return r;
    }

    it('(pointerDownOutside) and (interactOutside) fire with the same veto and close the menu', async () => {
      const r = await openFile();
      const target = appendOutside();

      document.dispatchEvent(outsidePointerDown(target));
      await flush(r.fixture);

      expect(r.instance.pointerDownOutsideCount).toBe(1);
      expect(r.instance.interactOutsideCount).toBe(1);
      expect(r.instance.focusOutsideCount).toBe(0);
      expect(r.instance.lastOutsideEvents[0]).toBe(r.instance.lastOutsideEvents[1]);
      expect(r.instance.open()).toBe('');
    });

    it('preventDefault() on (pointerDownOutside) keeps the menu open', async () => {
      const r = await openFile();
      r.instance.veto.set('pointerDownOutside');
      const target = appendOutside();

      document.dispatchEvent(outsidePointerDown(target));
      await flush(r.fixture);

      expect(r.instance.pointerDownOutsideCount).toBe(1);
      expect(r.instance.open()).toBe('file');
    });

    it('preventDefault() on (interactOutside) keeps the menu open (shared veto)', async () => {
      const r = await openFile();
      r.instance.veto.set('interactOutside');
      const target = appendOutside();

      document.dispatchEvent(outsidePointerDown(target));
      await flush(r.fixture);

      expect(r.instance.pointerDownOutsideCount).toBe(1);
      expect(r.instance.interactOutsideCount).toBe(1);
      expect(r.instance.open()).toBe('file');
    });

    it('(focusOutside) and (interactOutside) fire on an outside focusin and close the menu', async () => {
      const r = await openFile();
      const target = appendOutside();

      document.dispatchEvent(outsideFocusIn(target));
      await flush(r.fixture);

      expect(r.instance.focusOutsideCount).toBe(1);
      expect(r.instance.interactOutsideCount).toBe(1);
      expect(r.instance.pointerDownOutsideCount).toBe(0);
      expect(r.instance.open()).toBe('');
    });

    it('preventDefault() on (focusOutside) keeps the menu open', async () => {
      const r = await openFile();
      r.instance.veto.set('focusOutside');
      const target = appendOutside();

      document.dispatchEvent(outsideFocusIn(target));
      await flush(r.fixture);

      expect(r.instance.focusOutsideCount).toBe(1);
      expect(r.instance.open()).toBe('file');
    });

    it('a pointer-down on a sibling trigger emits nothing (exempt) and keeps the menu open', async () => {
      const r = await openFile();
      const edit = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;

      document.dispatchEvent(outsidePointerDown(edit));
      await flush(r.fixture);

      expect(r.instance.pointerDownOutsideCount).toBe(0);
      expect(r.instance.interactOutsideCount).toBe(0);
      expect(r.instance.open()).toBe('file');
    });

    it('(escapeKeyDown) fires with the raw KeyboardEvent and closes the menu', async () => {
      const r = await openFile();

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.escapeCount).toBe(1);
      expect(r.instance.lastEscapeEvent?.key).toBe('Escape');
      expect(r.instance.open()).toBe('');
    });

    it('preventDefault() on (escapeKeyDown) keeps the menu open', async () => {
      const r = await openFile();
      r.instance.veto.set('escape');

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.escapeCount).toBe(1);
      expect(r.instance.open()).toBe('file');
    });

    it('(autoFocusOnOpen) fires once on mount and (autoFocusOnClose) once on an Escape close', async () => {
      const r = await openFile();
      expect(r.instance.autoFocusOnOpenCount).toBe(1);
      expect(r.instance.autoFocusOnCloseCount).toBe(0);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.autoFocusOnCloseCount).toBe(1);
    });

    it('honors a vetoed (autoFocusOnOpen) without throwing and leaves the menu open', async () => {
      const r = renderHost(MenubarOutputsHost);
      r.instance.veto.set('autoFocusOnOpen');
      r.instance.open.set('file');
      await flush(r.fixture);

      expect(r.instance.autoFocusOnOpenCount).toBe(1);
      expect(r.instance.open()).toBe('file');
    });

    it('honors a vetoed (autoFocusOnClose) without throwing', async () => {
      const r = await openFile();
      r.instance.veto.set('autoFocusOnClose');

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.autoFocusOnCloseCount).toBe(1);
      expect(r.instance.open()).toBe('');
    });

    it('a hover-switch to a sibling trigger re-fires (autoFocusOnOpen) for the remounted content', async () => {
      const r = await openFile();
      expect(r.instance.autoFocusOnOpenCount).toBe(1);

      const edit = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[1]!;
      edit.dispatchEvent(pointerEvent('pointerenter'));
      await flush(r.fixture);

      expect(r.instance.open()).toBe('edit');
      expect(r.instance.autoFocusOnOpenCount).toBe(2);
    });
  });

  describe('hover', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('the pointer leaving the bar does not close the open menu or move focus', async () => {
      const { instance, query, queryAll, flush } = renderHost(MenubarHost);
      const file = queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.focus();
      pressKey(file, 'ArrowDown');
      await flush();
      expect(instance.open()).toBe('file');
      expect(document.activeElement).toBe(document.getElementById('file-new'));

      query<HTMLElement>('[forMenubar]')!.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      vi.advanceTimersByTime(5_000);
      await flush();

      expect(instance.open()).toBe('file');
      expect(document.activeElement).toBe(document.getElementById('file-new'));
    });

    it('the pointer leaving the portaled menu content does not close it either', async () => {
      const { instance, queryAll, flush } = renderHost(MenubarHost);
      const file = queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.focus();
      pressKey(file, 'ArrowDown');
      await flush();

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      content.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      vi.advanceTimersByTime(5_000);
      await flush();

      expect(instance.open()).toBe('file');
      expect(document.activeElement).toBe(document.getElementById('file-new'));
    });

    it('a pointer-opened menu is not closed by the pointer leaving the bar', async () => {
      const { instance, query, queryAll, flush } = renderHost(MenubarHost);
      const file = queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      file.click();
      await flush();
      expect(instance.open()).toBe('file');

      query<HTMLElement>('[forMenubar]')!.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      vi.advanceTimersByTime(5_000);
      await flush();

      expect(instance.open()).toBe('file');
    });

    it('hover-switch between open siblings stays instant', async () => {
      const { instance, queryAll, flush } = renderHost(MenubarHost);
      instance.open.set('file');
      await flush();

      // Moving directly onto a sibling trigger opens it immediately.
      const view = queryAll<HTMLButtonElement>('[forMenubarTrigger]')[2]!;
      view.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(instance.open()).toBe('view');
      expect(document.querySelector('#view-zoom')).not.toBeNull();
    });

    it('hover-switch to a template-earlier sibling swaps the mounted content', async () => {
      const { instance, queryAll, flush } = renderHost(MenubarHost);
      instance.open.set('view');
      await flush();

      const file = queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      file.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      expect(instance.open()).toBe('file');
      expect(document.querySelector('#view-zoom')).toBeNull();
      expect(document.querySelector('#file-new')).not.toBeNull();
    });
  });

  describe('item selection', () => {
    it('closes the menu and promotes the trigger back to the tab stop after selecting', async () => {
      const r = renderHost(MenubarHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      const item = document.getElementById('file-new')!;
      item.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe('');
      expect(r.instance.selects).toEqual(['file-new']);
      // Return-focus to the trigger is asserted in a real browser
      // (menubar.e2e.ts); the roving wiring reaction is observable here.
      const fileTrigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      expect(fileTrigger.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('submenu nesting', () => {
    it('opens a submenu inside a top-level menu without switching siblings', async () => {
      const r = renderHost(MenubarWithSubmenuHost);
      r.instance.open.set('file');
      await flush(r.fixture);

      const trigger = document.querySelector<HTMLElement>('[forMenuSubTrigger]')!;
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
      trigger.focus();
      // file is the first menubar trigger; loop=true makes 'prev' wrap to edit.
      pressKey(trigger, 'ArrowLeft');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('edit');
    });

    it('ArrowRight on a plain item inside a submenu collapses the chain and opens the next sibling menu (LTR)', async () => {
      const r = renderHost(MenubarNestedSubmenuHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      r.instance.recent.set(true);
      await flush(r.fixture);

      const item = document.getElementById('nested-a')!;
      item.focus();
      pressKey(item, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('edit');
      expect(r.instance.recent()).toBe(false);
      expect(document.getElementById('nested-edit-undo')!.getAttribute('data-highlighted')).toBe(
        '',
      );
    });

    it('collapses every nested submenu level before switching siblings', async () => {
      const r = renderHost(MenubarNestedSubmenuHost);
      r.instance.open.set('file');
      await flush(r.fixture);
      r.instance.recent.set(true);
      await flush(r.fixture);
      r.instance.deep.set(true);
      await flush(r.fixture);

      const item = document.getElementById('nested-deep')!;
      item.focus();
      pressKey(item, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('edit');
      expect(r.instance.deep()).toBe(false);
      expect(r.instance.recent()).toBe(false);
    });

    it('inverts the away-arrow inside a submenu in RTL', async () => {
      const r = renderHost(MenubarNestedSubmenuHost);
      r.instance.dir.set('rtl');
      r.instance.open.set('file');
      await flush(r.fixture);
      r.instance.recent.set(true);
      await flush(r.fixture);

      const item = document.getElementById('nested-a')!;
      item.focus();
      pressKey(item, 'ArrowLeft');
      await flush(r.fixture);

      expect(r.instance.open()).toBe('edit');
      expect(r.instance.recent()).toBe(false);
    });

    it('survives the first focus inside a submenu mounted in the same render pass as its parent', async () => {
      const r = renderHost(MenubarWithSubmenuHost);
      r.instance.open.set('file');
      r.instance.recent.set(true);
      await flush(r.fixture);

      const item = document.getElementById('recent-a')!;
      item.focus();
      await flush(r.fixture);

      expect(r.instance.open()).toBe('file');
      expect(r.instance.recent()).toBe(true);
    });

    it('dispatches Escape to the submenu, not the parent menu, after a same-render-pass mount', async () => {
      const r = renderHost(MenubarWithSubmenuHost);
      r.instance.open.set('file');
      r.instance.recent.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.recent()).toBe(false);
      expect(r.instance.open()).toBe('file');
    });

    it('RTL ArrowRight inside a submenu still collapses only that level', async () => {
      const r = renderHost(MenubarNestedSubmenuHost);
      r.instance.dir.set('rtl');
      r.instance.open.set('file');
      await flush(r.fixture);
      r.instance.recent.set(true);
      await flush(r.fixture);

      const item = document.getElementById('nested-a')!;
      item.focus();
      pressKey(item, 'ArrowRight');
      await flush(r.fixture);

      expect(r.instance.recent()).toBe(false);
      expect(r.instance.open()).toBe('file');
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

    it('does not emit when an open key re-targets the already-open trigger', async () => {
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
      const trigger = r.queryAll<HTMLButtonElement>('[forMenubarTrigger]')[0]!;
      pressKey(trigger, 'Enter');
      await flush(r.fixture);
      expect(internalEmits).toBe(1);

      trigger.focus();
      await flush(r.fixture);
      pressKey(trigger, 'Enter');
      await flush(r.fixture);
      expect(internalEmits).toBe(1);
      expect(document.activeElement?.id).toBe('a1');
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
