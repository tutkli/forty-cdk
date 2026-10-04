import { Component, inject, signal } from '@angular/core';

import { ForDialog } from 'forty-cdk/dialog';
import { ForDrawer } from 'forty-cdk/drawer';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
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

@Component({
  imports: [ForDialog, ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forDialog ariaLabel="Dialog">
      <button type="button" data-test-id="first">first</button>
      <div forPopover [(open)]="popoverOpen">
        <button type="button" forPopoverTrigger data-test-id="trigger">Filters</button>
        @if (popoverOpen()) {
          <div forPopoverContent>
            <input data-test-id="popover-first" />
            <input data-test-id="popover-last" />
          </div>
        }
      </div>
    </div>
  `,
})
class PopoverInDialogHost {
  readonly popoverOpen = signal(false);
}

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

  describe('a popover opened inside a modal dialog', () => {
    async function mountOpen() {
      const r = renderHost(PopoverInDialogHost);
      await r.flush();
      query('[data-test-id="trigger"]').click();
      await r.flush();
      return r;
    }

    it('lets Tab move natively between the popover inputs', async () => {
      const r = await mountOpen();
      const content = query('[forPopoverContent]');
      expect(content.hasAttribute('data-for-modal-peer')).toBe(true);
      query('[data-test-id="popover-first"]').focus();

      const event = pressTab();

      expect(event.defaultPrevented).toBe(false);
      expect(r.instance.popoverOpen()).toBe(true);
    });

    it('returns Tab past the last popover input to the dialog', async () => {
      await mountOpen();
      query('[data-test-id="popover-last"]').focus();

      const event = pressTab();

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('[forDialog] [data-test-id="first"]'));
    });
  });
});
