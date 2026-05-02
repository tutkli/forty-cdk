import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { _resetBodyScrollLockForTesting } from '../_internal/body-scroll-lock';
import { renderHost } from '../../test-utils/render';
import { ForDialog } from './dialog';
import { ForDialogBackdrop } from './dialog-backdrop';
import { ForDialogClose } from './dialog-close';
import { ForDialogDescription } from './dialog-description';
import { ForDialogTitle } from './dialog-title';

@Component({
  imports: [
    ForDialog,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogClose,
    ForDialogBackdrop,
  ],
  template: `
    <button #trigger type="button" (click)="open.set(true)">Open</button>
    <div
      forDialog
      [(open)]="open"
      [dismissible]="dismissible()"
      [alert]="alert()"
    >
      <div forDialogBackdrop></div>
      <h2 forDialogTitle>Confirm action</h2>
      <p forDialogDescription>This cannot be undone.</p>
      <button id="ok" type="button">OK</button>
      <button id="cancel" forDialogClose>Cancel</button>
    </div>
  `,
})
class DialogHost {
  readonly open = signal(false);
  readonly dismissible = signal(true);
  readonly alert = signal(false);
}

@Component({
  imports: [ForDialog],
  template: `
    <button (click)="open.set(true)">Open</button>
    <div forDialog [(open)]="open" [ariaLabel]="'Quick prompt'"></div>
  `,
})
class AriaLabelHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForDialog, ForDialogClose],
  template: `
    <div forDialog [(open)]="a">
      <button forDialogClose>close A</button>
    </div>
    <div forDialog [(open)]="b">
      <button forDialogClose>close B</button>
    </div>
  `,
})
class StackedDialogsHost {
  readonly a = signal(false);
  readonly b = signal(false);
}

async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('ForDialog (declarative)', () => {
  afterEach(() => {
    _resetBodyScrollLockForTesting();
    document.querySelectorAll('[forDialog], [data-for-dialog-backdrop]').forEach((n) => n.remove());
  });

  describe('a11y baseline', () => {
    it('sets role=dialog, aria-modal, and ties labelledby/describedby to title/description', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      const title = dialog.querySelector<HTMLElement>('[forDialogTitle]')!;
      const desc = dialog.querySelector<HTMLElement>('[forDialogDescription]')!;

      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
      expect(dialog.getAttribute('aria-describedby')).toBe(desc.id);
    });

    it('switches role to alertdialog when alert=true', async () => {
      const r = renderHost(DialogHost);
      r.instance.alert.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.getAttribute('role')).toBe('alertdialog');
    });

    it('honors a manual ariaLabel when no title is rendered', async () => {
      const r = renderHost(AriaLabelHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.getAttribute('aria-label')).toBe('Quick prompt');
      expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('initial state', () => {
    it('renders hidden when open is false', async () => {
      const r = renderHost(DialogHost);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.hasAttribute('hidden')).toBe(true);
      expect(dialog.getAttribute('data-state')).toBe('closed');
    });

    it('portals the dialog to document.body', async () => {
      const r = renderHost(DialogHost);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.parentElement).toBe(document.body);
    });
  });

  describe('open/close via [(open)]', () => {
    it('removes hidden and sets data-state=open on open', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.hasAttribute('hidden')).toBe(false);
      expect(dialog.getAttribute('data-state')).toBe('open');
    });

    it('moves focus into the dialog on open (first focusable)', async () => {
      const r = renderHost(DialogHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('ok');
    });

    it('returns focus to the previous element on close', async () => {
      const r = renderHost(DialogHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('Escape key', () => {
    it('closes a dismissible dialog', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('is ignored when dismissible=false', async () => {
      const r = renderHost(DialogHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('ForDialogClose', () => {
    it('closes the dialog when clicked', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const closeBtn = document.querySelector<HTMLButtonElement>('#cancel')!;
      closeBtn.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('closes regardless of dismissible (close button is always honored)', async () => {
      const r = renderHost(DialogHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const closeBtn = document.querySelector<HTMLButtonElement>('#cancel')!;
      closeBtn.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });
  });

  describe('ForDialogBackdrop', () => {
    it('closes the dialog on direct click when dismissible', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      // Simulate a direct click on the backdrop element.
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: backdrop, configurable: true });
      backdrop.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('does NOT close on click bubbled from a child element', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      const child = document.createElement('div');
      backdrop.appendChild(child);

      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: child, configurable: true });
      backdrop.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('is ignored when dismissible=false', async () => {
      const r = renderHost(DialogHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: backdrop, configurable: true });
      backdrop.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('is portaled to body alongside the dialog', async () => {
      const r = renderHost(DialogHost);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      expect(backdrop.parentElement).toBe(document.body);
    });
  });

  describe('focus trap', () => {
    it('cycles forward from the last focusable to the first', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const cancel = document.querySelector<HTMLButtonElement>('#cancel')!;
      cancel.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );

      expect(document.activeElement?.id).toBe('ok');
    });

    it('cycles backward on Shift+Tab from the first to the last', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const ok = document.querySelector<HTMLButtonElement>('#ok')!;
      ok.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
      );

      expect(document.activeElement?.id).toBe('cancel');
    });
  });

  describe('body scroll lock', () => {
    it('locks body overflow while open and restores on close', async () => {
      document.body.style.overflow = 'auto';
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.body.style.overflow).toBe('hidden');

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('stacked dialogs', () => {
    it('keeps body locked until the last dialog closes', async () => {
      const r = renderHost(StackedDialogsHost);
      r.instance.a.set(true);
      r.instance.b.set(true);
      await flush(r.fixture);

      expect(document.body.style.overflow).toBe('hidden');

      r.instance.a.set(false);
      await flush(r.fixture);
      expect(document.body.style.overflow).toBe('hidden');

      r.instance.b.set(false);
      await flush(r.fixture);
      expect(document.body.style.overflow).toBe('');
    });

    it('Escape closes only the topmost dialog (not the one underneath)', async () => {
      const r = renderHost(StackedDialogsHost);
      r.instance.a.set(true);
      r.instance.b.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.a()).toBe(true);
      expect(r.instance.b()).toBe(false);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.a()).toBe(false);
    });
  });

  describe('used outside [forDialog]', () => {
    function expectThrows(host: new (...args: unknown[]) => unknown, regex: RegExp): void {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(host as never)).toThrow(regex);
    }

    it('throws from ForDialogTitle', () => {
      @Component({
        imports: [ForDialogTitle],
        template: `<h2 forDialogTitle></h2>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/dialog\] ForDialogTitle/);
    });

    it('throws from ForDialogDescription', () => {
      @Component({
        imports: [ForDialogDescription],
        template: `<p forDialogDescription></p>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/dialog\] ForDialogDescription/);
    });

    it('throws from ForDialogClose', () => {
      @Component({
        imports: [ForDialogClose],
        template: `<button forDialogClose></button>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/dialog\] ForDialogClose/);
    });

    it('throws from ForDialogBackdrop', () => {
      @Component({
        imports: [ForDialogBackdrop],
        template: `<div forDialogBackdrop></div>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/dialog\] ForDialogBackdrop/);
    });
  });

  describe('mode flags', () => {
    it('keeps focus on the previously focused element when returnFocus=false', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <button #trigger type="button" (click)="open.set(true)">Open</button>
          <div forDialog [(open)]="open" [returnFocus]="false" ariaLabel="t">
            <button id="inside" type="button">In</button>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.activeElement?.id).toBe('inside');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.activeElement).not.toBe(trigger);
    });

    it('focuses the dialog container itself when initialFocus="container"', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" initialFocus="container" ariaLabel="t">
            <button id="inside" type="button">In</button>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(document.activeElement).toBe(dialog);
    });

    it('skips aria-modal, focus trap, and body scroll lock when modal=false', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" [modal]="false" ariaLabel="t">
            <button id="inside" type="button">In</button>
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      document.body.style.overflow = 'auto';
      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.hasAttribute('aria-modal')).toBe(false);
      expect(document.body.style.overflow).toBe('auto');

      // Focus is still sent in but Tab is not trapped: dispatching Tab from
      // outside the dialog should not pull focus back inside.
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      expect(document.activeElement).toBe(outside);
      outside.remove();
    });

    it('traps focus in the topmost dialog of a stack', async () => {
      const r = renderHost(StackedDialogsHost);
      r.instance.a.set(true);
      r.instance.b.set(true);
      await flush(r.fixture);

      const closes = document.querySelectorAll<HTMLButtonElement>('[forDialogClose]');
      const closeB = closes[1]!;
      closeB.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );

      // The B dialog only has one focusable, so Tab cycles back to the same
      // button — it must NOT escape into A's tree.
      expect(document.activeElement).toBe(closeB);
    });
  });

  describe('dismiss outputs (escapeKeyDown / pointerDownOutside / focusOutside / interactOutside)', () => {
    it('emits (escapeKeyDown) with the native event before closing', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" (escapeKeyDown)="captured.push($event)" ariaLabel="t"></div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly captured: KeyboardEvent[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(r.instance.captured[0]?.key).toBe('Escape');
      expect(r.instance.open()).toBe(false);
    });

    it('keeps the dialog open when the consumer calls preventDefault on (escapeKeyDown)', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" (escapeKeyDown)="$event.preventDefault()" ariaLabel="t"></div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('emits (pointerDownOutside) and (interactOutside) and closes when not prevented', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div
            forDialog
            [(open)]="open"
            (pointerDownOutside)="pointerCount = pointerCount + 1"
            (interactOutside)="interactCount = interactCount + 1"
            ariaLabel="t"
          ></div>
        `,
      })
      class Host {
        readonly open = signal(true);
        pointerCount = 0;
        interactCount = 0;
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.pointerCount).toBe(1);
      expect(r.instance.interactCount).toBe(1);
      expect(r.instance.open()).toBe(false);
      outside.remove();
    });

    it('keeps the dialog open when (pointerDownOutside) is preventDefault-ed', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div
            forDialog
            [(open)]="open"
            (pointerDownOutside)="$event.preventDefault()"
            ariaLabel="t"
          ></div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      outside.remove();
    });

    it('emits (focusOutside) and (interactOutside) when focus moves outside', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div
            forDialog
            [(open)]="open"
            (focusOutside)="focusCount = focusCount + 1"
            (interactOutside)="interactCount = interactCount + 1"
            ariaLabel="t"
          ></div>
        `,
      })
      class Host {
        readonly open = signal(true);
        focusCount = 0;
        interactCount = 0;
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const event = new FocusEvent('focusin', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.focusCount).toBe(1);
      expect(r.instance.interactCount).toBe(1);
      outside.remove();
    });

    it('does not fire dismiss outputs when dismissible=false (events still emit, close blocked)', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div
            forDialog
            [(open)]="open"
            [dismissible]="false"
            (escapeKeyDown)="escapes = escapes + 1"
            ariaLabel="t"
          ></div>
        `,
      })
      class Host {
        readonly open = signal(true);
        escapes = 0;
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.escapes).toBe(1);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('(openChange) output', () => {
    it('emits false when Escape closes the dialog', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" (openChange)="emitted.push($event)" ariaLabel="t"></div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly emitted: boolean[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flush(r.fixture);

      expect(r.instance.emitted).toEqual([false]);
    });

    it('emits false when [forDialogClose] is clicked', async () => {
      @Component({
        imports: [ForDialog, ForDialogClose],
        template: `
          <div forDialog [(open)]="open" (openChange)="emitted.push($event)" ariaLabel="t">
            <button id="cancel" forDialogClose>Cancel</button>
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly emitted: boolean[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.querySelector<HTMLButtonElement>('button#cancel')!.click();
      await flush(r.fixture);

      expect(r.instance.emitted).toEqual([false]);
    });

    it('does not emit when the consumer drives `open` externally via [(open)]', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" (openChange)="emitted.push($event)" ariaLabel="t"></div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly emitted: boolean[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.emitted).toEqual([]);
    });
  });

  describe('forceMount', () => {
    it('keeps the dialog mounted (no [hidden]) when open=false', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <div forDialog [(open)]="open" [forceMount]="true" ariaLabel="t"></div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.hasAttribute('hidden')).toBe(false);
      expect(dialog.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(dialog.hasAttribute('hidden')).toBe(false);
      expect(dialog.getAttribute('data-state')).toBe('open');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects open writes after detectChanges without Zone.js', async () => {
      const r = renderHost(DialogHost);
      const dialog = () => document.querySelector<HTMLElement>('[forDialog]')!;
      await flush(r.fixture);
      expect(dialog().hasAttribute('hidden')).toBe(true);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(dialog().hasAttribute('hidden')).toBe(false);
    });
  });
});
