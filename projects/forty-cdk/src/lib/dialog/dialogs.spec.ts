import {
  Component,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { _resetBodyScrollLockForTesting } from '../_internal/body-scroll-lock/body-scroll-lock';
import { ForDialogRef } from './dialog-ref';
import { ForDialogs, FOR_DIALOG_DATA, injectDialogData } from './dialogs';

interface ConfirmData {
  message: string;
}

@Component({
  template: `
    <p id="message">{{ data.message }}</p>
    <button id="ok" (click)="ok()">OK</button>
    <button id="cancel" (click)="cancel()">Cancel</button>
  `,
})
class ConfirmDialog {
  readonly data = injectDialogData<ConfirmData>();
  readonly ref = inject(ForDialogRef) as ForDialogRef<'confirm' | 'cancel'>;

  ok(): void {
    this.ref.close('confirm');
  }
  cancel(): void {
    this.ref.close('cancel');
  }
}

@Component({
  template: `<p>no buttons here</p>`,
})
class FocusableLessDialog {}

@Component({
  template: `<p>token check: {{ tokenValue }}</p>`,
})
class TokenInjectingDialog {
  readonly tokenValue = inject(FOR_DIALOG_DATA, { optional: true }) as string | null;
}

function setup(): { dialogs: ForDialogs; trigger: HTMLButtonElement } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const dialogs = TestBed.inject(ForDialogs);
  const trigger = document.createElement('button');
  trigger.id = 'external-trigger';
  trigger.textContent = 'open';
  document.body.appendChild(trigger);
  trigger.focus();
  return { dialogs, trigger };
}

describe('ForDialogs (programmatic)', () => {
  afterEach(() => {
    _resetBodyScrollLockForTesting();
    document
      .querySelectorAll('[role="dialog"], [role="alertdialog"], #external-trigger')
      .forEach((n) => n.remove());
  });

  describe('open()', () => {
    it('returns a ForDialogRef synchronously', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'hi' } });
      expect(ref).toBeInstanceOf(ForDialogRef);
    });

    it('mounts the component to document.body with role=dialog and aria-modal', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'hi' } });

      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host).toBeTruthy();
      expect(host.parentElement).toBe(document.body);
      expect(host.getAttribute('aria-modal')).toBe('true');
    });

    it('uses role=alertdialog when alert: true', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'hi' }, alert: true });
      expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    });

    it('renders the user component (data flows in via FOR_DIALOG_DATA)', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'Hello world' } });

      const message = document.querySelector('#message')!;
      expect(message.textContent).toBe('Hello world');
    });

    it('passes null for FOR_DIALOG_DATA when no data is configured', () => {
      const { dialogs } = setup();
      dialogs.open(TokenInjectingDialog);

      // FOR_DIALOG_DATA is provided as null when no `data` was configured;
      // {{ null }} renders as empty string in the template.
      expect(document.querySelector('p')!.textContent).toBe('token check: ');
    });

    it('honors the hostTag option', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, hostTag: 'section' });
      const host = document.querySelector('section[role="dialog"]');
      expect(host).toBeTruthy();
    });

    it('sets aria-label when configured', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, ariaLabel: 'Quick confirm' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('aria-label')).toBe('Quick confirm');
    });

    it('counts open dialogs reactively', () => {
      const { dialogs } = setup();
      expect(dialogs.openCount()).toBe(0);

      const a = dialogs.open(ConfirmDialog, { data: { message: 'a' } });
      expect(dialogs.openCount()).toBe(1);

      const b = dialogs.open(ConfirmDialog, { data: { message: 'b' } });
      expect(dialogs.openCount()).toBe(2);

      a.close();
      expect(dialogs.openCount()).toBe(1);

      b.close();
      expect(dialogs.openCount()).toBe(0);
    });
  });

  describe('ForDialogRef.close', () => {
    it('resolves the closed promise with the result', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, 'confirm' | 'cancel', ConfirmData>(
        ConfirmDialog,
        { data: { message: 'x' } },
      );

      document.querySelector<HTMLButtonElement>('#ok')!.click();

      const result = await ref.closed;
      expect(result).toBe('confirm');
    });

    it('reflects result and isClosed reactively', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, 'confirm' | 'cancel', ConfirmData>(
        ConfirmDialog,
        { data: { message: 'x' } },
      );

      expect(ref.isClosed()).toBe(false);
      expect(ref.result()).toBeUndefined();

      document.querySelector<HTMLButtonElement>('#cancel')!.click();
      await ref.closed;

      expect(ref.isClosed()).toBe(true);
      expect(ref.result()).toBe('cancel');
    });

    it('removes the host element from the DOM on close', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('is idempotent: a second close is a no-op', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, string>(ConfirmDialog, {
        data: { message: 'x' },
      });

      ref.close('first');
      ref.close('second'); // ignored
      const result = await ref.closed;

      expect(result).toBe('first');
    });
  });

  describe('focus management', () => {
    it('moves focus to the first focusable inside the dialog on open', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(document.activeElement?.id).toBe('ok');
    });

    it('returns focus to the previously focused element on close', async () => {
      const { dialogs, trigger } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      ref.close();
      await ref.closed;

      expect(document.activeElement).toBe(trigger);
    });

    it('skips returnFocus when configured off', async () => {
      const { dialogs, trigger } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        returnFocus: false,
      });
      ref.close();
      await ref.closed;

      expect(document.activeElement).not.toBe(trigger);
    });

    it('falls back to focusing the host when no focusable exists', () => {
      const { dialogs } = setup();
      dialogs.open(FocusableLessDialog);
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(document.activeElement).toBe(host);
    });
  });

  describe('Escape key', () => {
    it('closes a dismissible dialog and resolves with undefined', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, string | undefined>(
        ConfirmDialog,
        { data: { message: 'x' } },
      );

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      const result = await ref.closed;

      expect(result).toBeUndefined();
      expect(ref.isClosed()).toBe(true);
    });

    it('is ignored when dismissible: false', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        dismissible: false,
      });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(ref.isClosed()).toBe(false);

      ref.close();
    });
  });

  describe('body scroll lock', () => {
    it('locks while modal dialog is open and restores on close', async () => {
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(document.body.style.overflow).toBe('hidden');

      ref.close();
      await ref.closed;

      expect(document.body.style.overflow).toBe('auto');
    });

    it('does NOT lock for non-modal dialogs', () => {
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, modal: false });

      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('stacking', () => {
    it('keeps body locked across stacked dialogs until the last closes', async () => {
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      const a = dialogs.open(ConfirmDialog, { data: { message: 'a' } });
      const b = dialogs.open(ConfirmDialog, { data: { message: 'b' } });

      expect(document.body.style.overflow).toBe('hidden');

      a.close();
      await a.closed;
      expect(document.body.style.overflow).toBe('hidden');

      b.close();
      await b.closed;
      expect(document.body.style.overflow).toBe('auto');
    });
  });
});
