import { Component, inject, signal } from '@angular/core';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { provideNativeDateAdapter } from 'forty-cdk/date-adapter';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForDialog } from 'forty-cdk/dialog';
import { ForDrawer } from 'forty-cdk/drawer';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { pressKey } from 'forty-cdk/testing';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import { ForToastManager, ForToastViewport } from 'forty-cdk/toast';

import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { renderHost } from '../test-utils/render';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const TRAP_DEFINITION = 'core/src/focus-trap/focus-trap.ts';
const MODAL_SHELL = 'core-overlay/src/modal-shell/modal-shell.ts';

function codeMatching(pattern: RegExp, exclude: string): string[] {
  return [...LIBRARY_CODE]
    .filter(([path, code]) => path !== exclude && pattern.test(code))
    .map(([path]) => path)
    .sort();
}

function pressTab(shift = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
}

@Component({
  imports: [ForDialog, ForToastViewport],
  template: `
    <button type="button">before</button>
    @if (open()) {
      <div forDialog ariaLabel="Dialog" [initialFocus]="initialFocus()">
        <button type="button" data-test-id="first">first</button>
        <button type="button" data-test-id="last">last</button>
      </div>
    }
    <for-toast-viewport />
  `,
})
class DialogHost {
  readonly manager = inject(ForToastManager);
  readonly open = signal(true);
  readonly initialFocus = signal<'first' | 'container'>('first');
}

@Component({
  imports: [ForDrawer, ForToastViewport],
  template: `
    <button type="button">before</button>
    @if (open()) {
      <div forDrawer ariaLabel="Drawer" [initialFocus]="initialFocus()">
        <button type="button" data-test-id="first">first</button>
        <button type="button" data-test-id="last">last</button>
      </div>
    }
    <for-toast-viewport />
  `,
})
class DrawerHost {
  readonly manager = inject(ForToastManager);
  readonly open = signal(true);
  readonly initialFocus = signal<'first' | 'container'>('first');
}

type PeerKind =
  | 'select'
  | 'combobox'
  | 'dropdown-menu'
  | 'context-menu'
  | 'time-picker'
  | 'popover'
  | 'date-picker';

@Component({
  imports: [
    ForDialog,
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
    ForSelectOption,
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxContent,
    ForComboboxInput,
    ForComboboxList,
    ForComboboxOption,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForContextMenu,
    ForContextMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimePickerContent,
    ForTimePickerOption,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForDatePicker,
    ForDatePickerTrigger,
    ForDatePickerContent,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDialog ariaLabel="Dialog">
      <button type="button" data-test-id="before">before</button>
      @switch (kind()) {
        @case ('select') {
          <div forSelect [(open)]="open" ariaLabel="Fruit">
            <button type="button" forSelectTrigger data-test-id="trigger">Fruit</button>
            @if (open()) {
              <div forSelectContent data-test-id="surface">
                <div forSelectOption value="apple" data-test-id="surface-first">Apple</div>
                <div forSelectOption value="banana" data-test-id="surface-last">Banana</div>
              </div>
            }
          </div>
        }
        @case ('combobox') {
          <div forCombobox [(open)]="open" ariaLabel="Country">
            <button type="button" forComboboxTrigger data-test-id="trigger">Country</button>
            @if (open()) {
              <div forComboboxContent data-test-id="surface">
                <input forComboboxInput data-test-id="surface-only" />
                <div forComboboxList>
                  <div forComboboxOption value="es" label="Spain">Spain</div>
                </div>
              </div>
            }
          </div>
        }
        @case ('dropdown-menu') {
          <div forDropdownMenu [(open)]="open" ariaLabel="Actions">
            <button type="button" forDropdownMenuTrigger data-test-id="trigger">Actions</button>
            @if (open()) {
              <div forMenuContent data-test-id="surface">
                <button type="button" forMenuItem data-test-id="surface-first">Rename</button>
                <button type="button" forMenuItem data-test-id="surface-last">Delete</button>
              </div>
            }
          </div>
        }
        @case ('context-menu') {
          <div forContextMenu [(open)]="open" ariaLabel="Actions">
            <div forContextMenuTrigger tabindex="0" data-test-id="trigger">Region</div>
            @if (open()) {
              <div forMenuContent data-test-id="surface">
                <button type="button" forMenuItem data-test-id="surface-first">Rename</button>
                <button type="button" forMenuItem data-test-id="surface-last">Delete</button>
              </div>
            }
          </div>
        }
        @case ('time-picker') {
          <div forTimePicker [(open)]="open" ariaLabel="Time">
            <button type="button" forTimePickerTrigger data-test-id="trigger">Time</button>
            @if (open()) {
              <div forTimePickerContent data-test-id="surface">
                <div forTimePickerOption [value]="midnight" data-test-id="surface-first">00:00</div>
                <div forTimePickerOption [value]="noon" data-test-id="surface-last">12:00</div>
              </div>
            }
          </div>
        }
        @case ('popover') {
          <div forPopover [(open)]="open">
            <button type="button" forPopoverTrigger data-test-id="trigger">Filters</button>
            @if (open()) {
              <div forPopoverContent data-test-id="surface">
                <input data-test-id="surface-first" />
                <input data-test-id="surface-last" />
              </div>
            }
          </div>
        }
        @case ('date-picker') {
          <div forDatePicker [(open)]="open">
            <button type="button" forDatePickerTrigger data-test-id="trigger">Date</button>
            @if (open()) {
              <div forDatePickerContent data-test-id="surface">
                <button type="button" data-test-id="surface-first">Previous month</button>
                <button type="button" data-test-id="surface-last">Next month</button>
              </div>
            }
          </div>
        }
      }
      @if (trailing()) {
        <button type="button" data-test-id="after">after</button>
      }
    </div>
  `,
})
class PeerInDialogHost {
  readonly kind = signal<PeerKind>('popover');
  readonly open = signal(false);
  readonly trailing = signal(true);
  protected readonly midnight = new Date(2026, 0, 1, 0, 0);
  protected readonly noon = new Date(2026, 0, 1, 12, 0);
}

const PEER_SURFACES: readonly { kind: PeerKind; shiftTabPrevented: boolean }[] = [
  { kind: 'select', shiftTabPrevented: false },
  { kind: 'combobox', shiftTabPrevented: false },
  { kind: 'dropdown-menu', shiftTabPrevented: false },
  { kind: 'context-menu', shiftTabPrevented: false },
  { kind: 'time-picker', shiftTabPrevented: false },
  { kind: 'popover', shiftTabPrevented: true },
  { kind: 'date-picker', shiftTabPrevented: true },
];

const FIRST_CONTROL = '[data-test-id="surface-first"], [data-test-id="surface-only"]';
const LAST_CONTROL = '[data-test-id="surface-last"], [data-test-id="surface-only"]';

const MODAL_HOSTS = [
  { name: 'dialog', host: DialogHost, selector: '[forDialog]' },
  { name: 'drawer', host: DrawerHost, selector: '[forDrawer]' },
] as const;

function query(selector: string): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

describe('modal focus trap adopters', () => {
  afterEachOverlayCleanup();

  it('constructs a focus trap only in the shared modal shell', () => {
    expect(codeMatching(/\binjectFocusTrap\(|\bnew FocusTrap\(/, TRAP_DEFINITION)).toEqual([
      MODAL_SHELL,
    ]);
  });

  it('reaches every modal surface through the shared shell', () => {
    const callers = codeMatching(/\binjectModalShell\(/, MODAL_SHELL);

    expect(callers).toEqual(
      expect.arrayContaining([
        'date-picker/src/date-picker-content.ts',
        'dialog/src/dialog.ts',
        'drawer/src/drawer.ts',
        'select/src/select-content.ts',
        'time-picker/src/time-picker-content.ts',
      ]),
    );
  });

  describe.each(MODAL_HOSTS)('a toast over a modal $name', ({ host, selector }) => {
    async function mountWithToast() {
      const r = renderHost<DialogHost | DrawerHost>(host);
      await r.flush();
      r.instance.manager.show({
        title: 'Update available',
        duration: 0,
        action: { label: 'Reload', activate: () => undefined },
      });
      await r.flush();
      return r;
    }

    it('lets Tab move natively between the toast action and close buttons', async () => {
      await mountWithToast();
      query('[forToastAction]').focus();

      const event = pressTab();

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(query('[forToastAction]'));
    });

    it('lets Tab move natively from the focused viewport into its toasts', async () => {
      await mountWithToast();
      query('for-toast-viewport').focus();

      expect(pressTab().defaultPrevented).toBe(false);
    });

    it('returns Tab past the last toast control to the first control of the modal', async () => {
      await mountWithToast();
      query('[forToastClose]').focus();

      const event = pressTab();

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query(`${selector} [data-test-id="first"]`));
    });
  });

  describe.each(MODAL_HOSTS)(
    'a modal $name whose initial focus is its container',
    ({ host, selector }) => {
      it('wraps Shift+Tab to the last control instead of leaving the modal', async () => {
        const r = renderHost<DialogHost | DrawerHost>(host);
        await r.flush();
        r.instance.open.set(false);
        await r.flush();
        r.instance.initialFocus.set('container');
        r.instance.open.set(true);
        await r.flush();
        const surface = query(selector);
        expect(document.activeElement).toBe(surface);

        const event = pressTab(true);

        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(query(`${selector} [data-test-id="last"]`));
      });
    },
  );

  describe.each(PEER_SURFACES)(
    'a $kind opened inside a modal dialog',
    ({ kind, shiftTabPrevented }) => {
      async function mountOpen(edges: { trailing?: boolean } = {}) {
        const r = renderHost(PeerInDialogHost);
        r.instance.kind.set(kind);
        r.instance.trailing.set(edges.trailing ?? true);
        await r.flush();
        const trigger = query('[data-test-id="trigger"]');
        if (kind === 'context-menu') {
          trigger.focus();
          pressKey(trigger, 'F10', { shiftKey: true });
        } else {
          r.instance.open.set(true);
        }
        await r.flush();
        expect(query('[data-test-id="surface"]').hasAttribute('data-for-modal-peer')).toBe(true);
        return r;
      }

      it('leaves Tab past the last control to the surface, landing on the trigger', async () => {
        const r = await mountOpen();
        query(LAST_CONTROL).focus();

        const event = pressTab();
        await r.flush();

        expect(event.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(query('[data-test-id="trigger"]'));
        expect(r.instance.open()).toBe(false);
      });

      it('leaves Shift+Tab before the first control to the surface, landing on the trigger', async () => {
        const r = await mountOpen();
        query(FIRST_CONTROL).focus();

        const event = pressTab(true);
        await r.flush();

        expect(event.defaultPrevented).toBe(shiftTabPrevented);
        expect(document.activeElement).toBe(query('[data-test-id="trigger"]'));
        expect(r.instance.open()).toBe(false);
      });

      it('wraps Tab to the first dialog control when the trigger is the last one', async () => {
        const r = await mountOpen({ trailing: false });
        query(LAST_CONTROL).focus();

        const event = pressTab();
        await r.flush();

        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(query('[data-test-id="before"]'));
        expect(r.instance.open()).toBe(false);
      });
    },
  );

  describe('a popover opened inside a modal dialog', () => {
    it('lets Tab move natively between the popover controls', async () => {
      const r = renderHost(PeerInDialogHost);
      await r.flush();
      r.instance.open.set(true);
      await r.flush();
      query('[data-test-id="surface-first"]').focus();

      const event = pressTab();

      expect(event.defaultPrevented).toBe(false);
      expect(r.instance.open()).toBe(true);
    });
  });
});
