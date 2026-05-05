import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { _resetBodyScrollLockForTesting } from '../_internal/body-scroll-lock/body-scroll-lock';
import { renderHost } from '../../test-utils/render';
import { ForDialog } from './dialog';
import { ForDialogBackdrop } from './dialog-backdrop';
import { ForDialogClose } from './dialog-close';
import type { ForDialogCloseReason } from './dialog-context';
import { ForDialogDescription } from './dialog-description';
import { ForDialogTitle } from './dialog-title';
import { ForDialogTrigger } from './dialog-trigger';

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
    @if (open()) {
      <div
        forDialog
        (close)="open.set(false); reasons.push($event)"
        [dismissible]="dismissible()"
        [alert]="alert()"
      >
        <div forDialogBackdrop></div>
        <h2 forDialogTitle>Confirm action</h2>
        <p forDialogDescription>This cannot be undone.</p>
        <button id="ok" type="button">OK</button>
        <button id="cancel" forDialogClose>Cancel</button>
      </div>
    }
  `,
})
class DialogHost {
  readonly open = signal(false);
  readonly dismissible = signal(true);
  readonly alert = signal(false);
  readonly reasons: ForDialogCloseReason[] = [];
}

@Component({
  imports: [ForDialog],
  template: `
    <button (click)="open.set(true)">Open</button>
    @if (open()) {
      <div forDialog (close)="open.set(false)" [ariaLabel]="'Quick prompt'"></div>
    }
  `,
})
class AriaLabelHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForDialog, ForDialogClose],
  template: `
    @if (a()) {
      <div forDialog (close)="a.set(false)">
        <button forDialogClose>close A</button>
      </div>
    }
    @if (b()) {
      <div forDialog (close)="b.set(false)">
        <button forDialogClose>close B</button>
      </div>
    }
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

  describe('data-state reflection', () => {
    it('reflects data-state="open" on host, backdrop, and close while mounted', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      const backdrop = document.querySelector<HTMLElement>('[forDialogBackdrop]')!;
      const closeBtn = document.querySelector<HTMLElement>('[forDialogClose]')!;

      expect(dialog.getAttribute('data-state')).toBe('open');
      expect(backdrop.getAttribute('data-state')).toBe('open');
      expect(closeBtn.getAttribute('data-state')).toBe('open');
    });

    it('removes the dialog (and its data-state) entirely when consumer signal flips false', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forDialog]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.querySelector('[forDialog]')).toBeNull();
      expect(document.querySelector('[forDialogBackdrop]')).toBeNull();
      expect(document.querySelector('[forDialogClose]')).toBeNull();
    });
  });

  describe('initial state', () => {
    it('does not render the dialog while the consumer signal is false', async () => {
      const r = renderHost(DialogHost);
      await flush(r.fixture);

      expect(document.querySelector('[forDialog]')).toBeNull();
    });

    it('portals the dialog to document.body once opened', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.parentElement).toBe(document.body);
    });
  });

  describe('mount/unmount via @if', () => {
    it('mounts when the consumer signal flips true', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.querySelector('[forDialog]')).not.toBeNull();
    });

    it('moves focus into the dialog on mount (first focusable)', async () => {
      const r = renderHost(DialogHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('ok');
    });

    it('returns focus to the previous element on unmount', async () => {
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
    it('emits (close) with reason "escape" while dismissible', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['escape']);
    });

    it('does not emit (close) when dismissible=false', async () => {
      const r = renderHost(DialogHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(r.instance.reasons).toEqual([]);
    });
  });

  describe('ForDialogClose', () => {
    it('emits (close) with reason "closeButton" when clicked', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const closeBtn = document.querySelector<HTMLButtonElement>('#cancel')!;
      closeBtn.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['closeButton']);
    });

    it('always emits (close) regardless of dismissible (close button is non-dismiss)', async () => {
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
    it('emits (close) with reason "backdrop" on direct click when dismissible', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: backdrop, configurable: true });
      backdrop.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['backdrop']);
    });

    it('does NOT emit on click bubbled from a child element', async () => {
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

    it('does not emit (close) when dismissible=false', async () => {
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
      r.instance.open.set(true);
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
    it('locks body overflow while mounted and restores on unmount', async () => {
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
    it('keeps body locked until the last dialog unmounts', async () => {
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
          @if (open()) {
            <div forDialog (close)="open.set(false)" [returnFocus]="false" ariaLabel="t">
              <button id="inside" type="button">In</button>
            </div>
          }
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
          @if (open()) {
            <div forDialog (close)="open.set(false)" initialFocus="container" ariaLabel="t">
              <button id="inside" type="button">In</button>
            </div>
          }
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
          @if (open()) {
            <div forDialog (close)="open.set(false)" [modal]="false" ariaLabel="t">
              <button id="inside" type="button">In</button>
            </div>
          }
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
    it('emits (escapeKeyDown) with the native event before emitting (close)', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          @if (open()) {
            <div forDialog (close)="open.set(false)" (escapeKeyDown)="captured.push($event)" ariaLabel="t"></div>
          }
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
          @if (open()) {
            <div forDialog (close)="open.set(false)" (escapeKeyDown)="$event.preventDefault()" ariaLabel="t"></div>
          }
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

    it('emits (pointerDownOutside) and (interactOutside), then (close), when not prevented', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          @if (open()) {
            <div
              forDialog
              (close)="open.set(false)"
              (pointerDownOutside)="pointerCount = pointerCount + 1"
              (interactOutside)="interactCount = interactCount + 1"
              ariaLabel="t"
            ></div>
          }
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
          @if (open()) {
            <div
              forDialog
              (close)="open.set(false)"
              (pointerDownOutside)="$event.preventDefault()"
              ariaLabel="t"
            ></div>
          }
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
          @if (open()) {
            <div
              forDialog
              (close)="open.set(false)"
              (focusOutside)="focusCount = focusCount + 1"
              (interactOutside)="interactCount = interactCount + 1"
              ariaLabel="t"
            ></div>
          }
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

    it('still emits the event but suppresses (close) when dismissible=false', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          @if (open()) {
            <div
              forDialog
              [dismissible]="false"
              (close)="open.set(false)"
              (escapeKeyDown)="escapes = escapes + 1"
              ariaLabel="t"
            ></div>
          }
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

  describe('zoneless reactivity', () => {
    it('mounts and unmounts after detectChanges without Zone.js', async () => {
      const r = renderHost(DialogHost);
      await flush(r.fixture);
      expect(document.querySelector('[forDialog]')).toBeNull();

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forDialog]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forDialog]')).toBeNull();
    });
  });
});

describe('ForDialogTrigger', () => {
  afterEach(() => {
    _resetBodyScrollLockForTesting();
    document.querySelectorAll('[forDialog], [data-for-dialog-backdrop]').forEach((n) => n.remove());
  });

  @Component({
    imports: [ForDialog, ForDialogTrigger],
    template: `
      <button forDialogTrigger [(open)]="open" [controls]="dialogId" [disabled]="disabled()">
        Open
      </button>
      @if (open()) {
        <div forDialog [id]="dialogId" (close)="open.set(false)" ariaLabel="t"></div>
      }
    `,
  })
  class TriggerHost {
    readonly open = signal(false);
    readonly disabled = signal(false);
    readonly dialogId = 'my-dialog';
  }

  it('reflects type=button, aria-haspopup, and aria-expanded=false when closed', async () => {
    const r = renderHost(TriggerHost);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('flips aria-expanded, aria-controls, and data-state when the dialog opens', async () => {
    const r = renderHost(TriggerHost);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

    trigger.click();
    await flush(r.fixture);

    expect(r.instance.open()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe('my-dialog');
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('toggles open on each click', async () => {
    const r = renderHost(TriggerHost);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

    trigger.click();
    await flush(r.fixture);
    expect(r.instance.open()).toBe(true);

    trigger.click();
    await flush(r.fixture);
    expect(r.instance.open()).toBe(false);
  });

  it('ignores clicks and reflects data-disabled when disabled=true', async () => {
    const r = renderHost(TriggerHost);
    r.instance.disabled.set(true);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

    expect(trigger.getAttribute('data-disabled')).toBe('');
    trigger.click();
    await flush(r.fixture);

    expect(r.instance.open()).toBe(false);
  });

  it('returns focus to the trigger after the dialog closes', async () => {
    const r = renderHost(TriggerHost);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

    trigger.focus();
    trigger.click();
    await flush(r.fixture);
    expect(r.instance.open()).toBe(true);

    r.instance.open.set(false);
    await flush(r.fixture);

    expect(document.activeElement).toBe(trigger);
  });

  describe('zoneless reactivity', () => {
    it('reacts to open changes after detectChanges without Zone.js', async () => {
      const r = renderHost(TriggerHost);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
