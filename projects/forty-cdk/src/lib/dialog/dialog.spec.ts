import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type {
  VetoableEvent,
  VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  afterEachOverlayCleanup,
  flush,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../test-utils';
import { assertDismissableLayerContract } from '../../test-utils/contract';
import { ForDialog } from './dialog';
import { ForDialogBackdrop } from './dialog-backdrop';
import { ForDialogClose } from './dialog-close';
import type { ForDialogCloseReason } from './dialog-context';
import { ForDialogDescription } from './dialog-description';
import { ForDialogTitle } from './dialog-title';
import { ForDialogTrigger } from './dialog-trigger';

@Component({
  imports: [ForDialog, ForDialogTitle, ForDialogDescription, ForDialogClose, ForDialogBackdrop],
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
  imports: [ForDialog, ForDialogTitle],
  template: `
    <button (click)="open.set(true)">Open</button>
    @if (open()) {
      <div forDialog (close)="open.set(false)" [ariaLabel]="''">
        <h2 forDialogTitle>Confirm</h2>
      </div>
    }
  `,
})
class EmptyAriaLabelHost {
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

@Component({
  imports: [ForDialog],
  template: `
    @if (open()) {
      <div
        forDialog
        [dismissible]="dismissible()"
        (close)="open.set(false)"
        (escapeKeyDown)="onEscape($event)"
        (pointerDownOutside)="onPointer($event)"
        (focusOutside)="onFocus($event)"
        (interactOutside)="onInteract($event)"
        ariaLabel="t"
      ></div>
    }
  `,
})
class DismissableContractHost {
  readonly open = signal(false);
  readonly dismissible = signal(true);
  escapeVeto = false;
  pointerVeto = false;
  eCount = 0;
  pCount = 0;
  fCount = 0;
  iCount = 0;
  onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    this.eCount += 1;
    if (this.escapeVeto) event.preventDefault();
  }
  onPointer(event: VetoableNativeEvent<PointerEvent>): void {
    this.pCount += 1;
    if (this.pointerVeto) event.preventDefault();
  }
  onFocus(_event: VetoableNativeEvent<FocusEvent>): void {
    this.fCount += 1;
  }
  onInteract(_event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.iCount += 1;
  }
}

describe('ForDialog (declarative)', () => {
  afterEachOverlayCleanup();

  describe('portal cleanup', () => {
    it('removes the portaled dialog and backdrop from document.body on close', async () => {
      // Issue #89 reproduction. Without the destroy fix in `injectPortal`, an
      // open + close cycle would leave `[forDialog]` and
      // `[data-for-dialog-backdrop]` attached to `document.body`, motivating a
      // manual `afterEach(remove)` band-aid in every overlay spec.
      const r = renderHost(DialogHost);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelectorAll('[forDialog]')).toHaveLength(1);
      expect(document.querySelectorAll('[data-for-dialog-backdrop]')).toHaveLength(1);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelectorAll('[forDialog]')).toHaveLength(0);
      expect(document.querySelectorAll('[data-for-dialog-backdrop]')).toHaveLength(0);
    });
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

    it('emits no aria-label for an empty ariaLabel and keeps aria-labelledby', async () => {
      const r = renderHost(EmptyAriaLabelHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      const title = dialog.querySelector<HTMLElement>('[forDialogTitle]')!;
      expect(dialog.hasAttribute('aria-label')).toBe(false);
      expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
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

  assertDismissableLayerContract({
    mount: async (options = {}) => {
      const r = renderHost(DismissableContractHost);
      r.instance.dismissible.set(options.dismissible ?? true);
      r.instance.escapeVeto = options.escapeVeto ?? false;
      r.instance.pointerVeto = options.pointerVeto ?? false;
      r.instance.open.set(true);
      await flush(r.fixture);
      return {
        flush: () => flush(r.fixture),
        isOpen: () => r.instance.open(),
        escapeCount: () => r.instance.eCount,
        pointerOutsideCount: () => r.instance.pCount,
        focusOutsideCount: () => r.instance.fCount,
        interactOutsideCount: () => r.instance.iCount,
      };
    },
  });

  describe('Escape key (close-reason payload)', () => {
    it('emits (close) with reason "escape" while dismissible', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['escape']);
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
    it('does not emit data-for-dialog-id in the declarative path (it is manager-only)', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      expect(backdrop.hasAttribute('data-for-dialog-id')).toBe(false);
    });

    it('emits (close) with reason "backdrop" on direct click when dismissible', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: backdrop, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [backdrop], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [child], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [backdrop], configurable: true });
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

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.a()).toBe(true);
      expect(r.instance.b()).toBe(false);

      pressKey(document, 'Escape');
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

  describe('inert siblings', () => {
    it('does not inert the dialog itself or its backdrop', async () => {
      const r = renderHost(DialogHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      const backdrop = document.querySelector<HTMLElement>('[data-for-dialog-backdrop]')!;

      expect(dialog.hasAttribute('inert')).toBe(false);
      expect(dialog.hasAttribute('aria-hidden')).toBe(false);
      expect(backdrop.hasAttribute('inert')).toBe(false);
      expect(backdrop.hasAttribute('aria-hidden')).toBe(false);
    });

    it('does not inert siblings when modal=false (non-modal dialog)', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          @if (open()) {
            <div forDialog (close)="open.set(false)" [modal]="false" ariaLabel="t"></div>
          }
        `,
      })
      class NonModalHost {
        readonly open = signal(false);
      }

      const sibling = document.createElement('section');
      document.body.appendChild(sibling);

      try {
        const r = renderHost(NonModalHost);
        r.instance.open.set(true);
        await flush(r.fixture);

        expect(sibling.hasAttribute('inert')).toBe(false);
        expect(sibling.hasAttribute('aria-hidden')).toBe(false);
      } finally {
        sibling.remove();
      }
    });

    it('stacking: a second open dialog inerts the first; closing it unhides the first', async () => {
      const sibling = document.createElement('section');
      document.body.appendChild(sibling);

      try {
        const r = renderHost(StackedDialogsHost);
        r.instance.a.set(true);
        await flush(r.fixture);

        const dialogs = () => Array.from(document.querySelectorAll<HTMLElement>('[forDialog]'));

        let [dialogA] = dialogs();
        expect(dialogA!.hasAttribute('inert')).toBe(false);
        expect(sibling.hasAttribute('inert')).toBe(true);

        r.instance.b.set(true);
        await flush(r.fixture);

        const all = dialogs();
        const dialogB = all[1]!;
        dialogA = all[0]!;

        expect(dialogB.hasAttribute('inert')).toBe(false);
        expect(dialogA.hasAttribute('inert')).toBe(true);
        expect(dialogA.getAttribute('aria-hidden')).toBe('true');
        expect(sibling.hasAttribute('inert')).toBe(true);

        r.instance.b.set(false);
        await flush(r.fixture);

        expect(dialogA.hasAttribute('inert')).toBe(false);
        expect(dialogA.hasAttribute('aria-hidden')).toBe(false);
        expect(sibling.hasAttribute('inert')).toBe(true);

        r.instance.a.set(false);
        await flush(r.fixture);

        expect(sibling.hasAttribute('inert')).toBe(false);
        expect(sibling.hasAttribute('aria-hidden')).toBe(false);
      } finally {
        sibling.remove();
      }
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

  describe('prefers-reduced-motion: reduce', () => {
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreReducedMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreReducedMotion();
    });

    it('mount/unmount cycle still portals, focuses, and emits (close) under reduced-motion', async () => {
      const r = renderHost(DialogHost);
      const trigger = r.query<HTMLButtonElement>('button')!;
      trigger.focus();

      r.instance.open.set(true);
      await flush(r.fixture);

      const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('data-state')).toBe('open');
      expect(document.activeElement?.id).toBe('ok');

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.reasons).toEqual(['escape']);
      expect(document.querySelector('[forDialog]')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('autoFocusOnOpen / autoFocusOnClose', () => {
    it('invokes [autoFocusOnOpen] before moving focus into the dialog', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          @if (open()) {
            <div
              forDialog
              (close)="open.set(false)"
              [autoFocusOnOpen]="onAutoFocusOpen"
              ariaLabel="t"
            >
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly captured: VetoableEvent[] = [];
        readonly onAutoFocusOpen = (event: VetoableEvent): void => {
          this.captured.push(event);
        };
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(typeof r.instance.captured[0]?.preventDefault).toBe('function');
      expect(r.instance.captured[0]?.defaultPrevented).toBe(false);
      expect(document.activeElement?.id).toBe('inside');
    });

    it('keeps focus outside the dialog when [autoFocusOnOpen] calls preventDefault', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <input #q id="search" type="search" />
          @if (open()) {
            <div forDialog (close)="open.set(false)" [autoFocusOnOpen]="vetoOpen" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly vetoOpen = (event: VetoableEvent): void => {
          event.preventDefault();
        };
      }

      const r = renderHost(Host);
      const search = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#search',
      ) as HTMLInputElement;
      search.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      // Initial focus move skipped — focus stayed on the search input.
      expect(document.activeElement?.id).toBe('search');
      // Trap is still active: Tab cycles inside the dialog once focus enters it.
      const inside = document.querySelector<HTMLElement>('#inside')!;
      inside.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      expect(document.activeElement?.id).toBe('inside');
    });

    it('fires [autoFocusOnClose] once when closing via the (close) output', async () => {
      // Issue #104 path-1: close via close button → `requestClose` →
      // `(close)` output → consumer flips the `@if`-gating signal.
      // Callback must fire exactly once, in the destroy hook.
      @Component({
        imports: [ForDialog, ForDialogClose],
        template: `
          <button id="trigger" (click)="open.set(true)">open</button>
          @if (open()) {
            <div
              forDialog
              (close)="open.set(false); closeCount = closeCount + 1"
              [autoFocusOnClose]="vetoClose"
              ariaLabel="t"
            >
              <button id="inside">inside</button>
              <button id="cancel" forDialogClose>Cancel</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        callCount = 0;
        closeCount = 0;
        readonly vetoClose = (event: VetoableEvent): void => {
          this.callCount += 1;
          event.preventDefault();
        };
      }

      const r = renderHost(Host);
      const trigger = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#trigger',
      ) as HTMLButtonElement;
      trigger.focus();
      expect(document.activeElement?.id).toBe('trigger');

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.activeElement?.id).toBe('inside');

      // Close via the close button — goes through `(close)` output →
      // consumer flips signal → `@if` unmounts → destroy hook fires the
      // callback. Cancel is INSIDE the dialog, so focusing it does not
      // trip the dismissable layer's outside-focus path.
      const cancel = document.querySelector<HTMLButtonElement>('#cancel')!;
      cancel.click();
      await flush(r.fixture);

      // Issue #104 acceptance: callback fires once (not twice) on the (close) path.
      expect(r.instance.callCount).toBe(1);
      expect(r.instance.closeCount).toBe(1);
      // returnFocus was vetoed — focus did NOT return to the trigger.
      expect(document.activeElement).not.toBe(trigger);
    });

    it('skips return-focus when [autoFocusOnClose] calls preventDefault (close via direct signal flip)', async () => {
      // Issue #104 path-2 reproduction: consumer flips `open.set(false)`
      // directly without going through `(close)` (no listener bound).
      // Before the refactor, `requestClose` was never invoked, so the
      // veto event was never emitted — the dialog silently fell back to
      // the default return-focus behaviour. After the refactor, the
      // callback fires from the destroy hook regardless of close path.
      @Component({
        imports: [ForDialog],
        template: `
          <button id="trigger" (click)="open.set(true)">open</button>
          @if (open()) {
            <div forDialog [autoFocusOnClose]="vetoClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        callCount = 0;
        readonly vetoClose = (event: VetoableEvent): void => {
          this.callCount += 1;
          event.preventDefault();
        };
      }

      const r = renderHost(Host);
      const trigger = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#trigger',
      ) as HTMLButtonElement;
      trigger.focus();

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.activeElement?.id).toBe('inside');

      const sentinel = document.createElement('button');
      sentinel.id = 'sentinel';
      document.body.appendChild(sentinel);
      sentinel.focus();
      expect(document.activeElement?.id).toBe('sentinel');

      // Direct signal flip — bypasses `(close)` entirely.
      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.callCount).toBe(1);
      expect(document.activeElement?.id).toBe('sentinel');
      sentinel.remove();
    });

    it('runs return-focus by default when [autoFocusOnClose] does NOT preventDefault', async () => {
      @Component({
        imports: [ForDialog],
        template: `
          <button id="trigger" (click)="open.set(true)">open</button>
          @if (open()) {
            <div forDialog (close)="open.set(false)" [autoFocusOnClose]="onClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        callCount = 0;
        readonly onClose = (_event: VetoableEvent): void => {
          this.callCount += 1;
          // No preventDefault — return-focus must still happen.
        };
      }

      const r = renderHost(Host);
      const trigger = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#trigger',
      ) as HTMLButtonElement;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.callCount).toBe(1);
      expect(document.activeElement).toBe(trigger);
    });

    it('fires [autoFocusOnClose] exactly once on close when [modal]="false" (issue #174)', async () => {
      // Issue #174: callback was previously skipped on the non-modal close
      // path because the invocation lived inside the `if (#activatedAsModal)`
      // branch of the destroy hook. After the fix, the callback fires on
      // every close path regardless of mode — matching `ForDialogManager`.
      @Component({
        imports: [ForDialog],
        template: `
          <button id="trigger" (click)="open.set(true)">open</button>
          @if (open()) {
            <div forDialog [modal]="false" [autoFocusOnClose]="onClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        callCount = 0;
        readonly onClose = (_event: VetoableEvent): void => {
          this.callCount += 1;
        };
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.callCount).toBe(1);
    });

    it('exposes the veto state on the non-modal close event for consumer inspection (issue #174)', async () => {
      // Non-modal mode never moves focus on close, so the veto is purely
      // informational — but the callback still receives a VetoableEvent so
      // consumers' code path is identical regardless of mode.
      @Component({
        imports: [ForDialog],
        template: `
          @if (open()) {
            <div forDialog [modal]="false" [autoFocusOnClose]="vetoClose" ariaLabel="t">
              <button id="inside">inside</button>
            </div>
          }
        `,
      })
      class Host {
        readonly open = signal(false);
        captured: VetoableEvent | null = null;
        readonly vetoClose = (event: VetoableEvent): void => {
          event.preventDefault();
          this.captured = event;
        };
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.captured?.defaultPrevented).toBe(true);
    });

    describe('container (scoped dialog)', () => {
      let boxEl: HTMLDivElement;

      beforeEach(() => {
        boxEl = document.createElement('div');
        boxEl.id = 'scoped-box';
        document.body.appendChild(boxEl);
      });

      afterEach(() => {
        boxEl.remove();
      });

      it('portals the surface into the container element', async () => {
        @Component({
          imports: [ForDialog],
          template: `
            @if (open()) {
              <div forDialog [modal]="false" [container]="box" (close)="open.set(false)" ariaLabel="t">
                <button id="inside">In</button>
              </div>
            }
          `,
        })
        class Host {
          readonly open = signal(false);
          readonly box = boxEl;
        }

        const r = renderHost(Host);
        r.instance.open.set(true);
        await flush(r.fixture);

        const dialog = document.querySelector<HTMLElement>('[forDialog]')!;
        expect(dialog.parentElement).toBe(boxEl);
      });
    });

    describe('zoneless reactivity', () => {
      it('fires [autoFocusOnClose] under provideZonelessChangeDetection on direct signal-flip close', async () => {
        @Component({
          imports: [ForDialog],
          template: `
            <button id="trigger" (click)="open.set(true)">open</button>
            @if (open()) {
              <div forDialog [autoFocusOnClose]="onClose" ariaLabel="t">
                <button id="inside">inside</button>
              </div>
            }
          `,
        })
        class ZonelessHost {
          readonly open = signal(false);
          callCount = 0;
          readonly onClose = (_event: VetoableEvent): void => {
            this.callCount += 1;
          };
        }

        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const r = renderHost(ZonelessHost);
        await flush(r.fixture);

        r.instance.open.set(true);
        await flush(r.fixture);

        r.instance.open.set(false);
        await flush(r.fixture);

        expect(r.instance.callCount).toBe(1);
      });
    });
  });
});

describe('ForDialogTrigger', () => {
  afterEachOverlayCleanup();

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
    // Disabled-related attributes are absent when not disabled — never
    // emitted as "false". Consumers must select on `:not([aria-disabled])`.
    expect(trigger.hasAttribute('data-disabled')).toBe(false);
    expect(trigger.hasAttribute('aria-disabled')).toBe(false);
    expect(trigger.hasAttribute('disabled')).toBe(false);
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

  it('ignores clicks and reflects disabled attributes when disabled=true', async () => {
    const r = renderHost(TriggerHost);
    r.instance.disabled.set(true);
    await flush(r.fixture);
    const trigger = r.query<HTMLButtonElement>('[forDialogTrigger]')!;

    expect(trigger.getAttribute('data-disabled')).toBe('');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.getAttribute('disabled')).toBe('');
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

  describe('missing controls dev-mode warning', () => {
    @Component({
      imports: [ForDialog, ForDialogTrigger],
      template: `
        <button forDialogTrigger [(open)]="open">Open</button>
        @if (open()) {
          <div forDialog (close)="open.set(false)" ariaLabel="t"></div>
        }
      `,
    })
    class NoControlsHost {
      readonly open = signal(false);
    }

    it('warns when the trigger opens without [controls]', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const r = renderHost(NoControlsHost);
      await flush(r.fixture);
      expect(warn).not.toHaveBeenCalled();

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('[forty-cdk/dialog]');
    });

    it('does not warn when [controls] is provided', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const r = renderHost(TriggerHost);
      await flush(r.fixture);

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
