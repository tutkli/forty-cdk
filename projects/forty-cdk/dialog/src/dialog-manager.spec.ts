import {
  Component,
  effect,
  inject,
  Injector,
  InjectionToken,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey } from '../../src/test-utils';
import { ForDialogBackdrop } from './dialog-backdrop';
import { ForDialogClose } from './dialog-close';
import { ForDialogDescription } from './dialog-description';
import { ForDialogRef } from './dialog-ref';
import { ForDialogManager, FOR_DIALOG_DATA, injectDialogData } from './dialog-manager';
import { provideForDialogDefaults } from './dialog-defaults';
import { ForDialogTitle } from './dialog-title';

interface ConfirmData {
  message: string;
}

@Component({
  template: `
    <p id="message">{{ data?.message }}</p>
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

@Component({
  template: `<p id="typed-null">{{ data === null ? 'null' : 'value' }}</p>`,
})
class TypedDataDialog {
  readonly data: ConfirmData | null = injectDialogData<ConfirmData>();
}

function setup(extraProviders: Parameters<typeof TestBed.configureTestingModule>[0] = {}): {
  dialogs: ForDialogManager;
  trigger: HTMLButtonElement;
} {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...(extraProviders.providers ?? [])],
  });
  const dialogs = TestBed.inject(ForDialogManager);
  const trigger = document.createElement('button');
  trigger.id = 'external-trigger';
  trigger.textContent = 'open';
  document.body.appendChild(trigger);
  trigger.focus();
  return { dialogs, trigger };
}

describe('ForDialogManager (programmatic)', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    document.querySelectorAll('#external-trigger').forEach((n) => n.remove());
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    TestBed.resetTestingModule();
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

    it('injectDialogData() resolves to null (typed T | null) when no data is configured', () => {
      const { dialogs } = setup();
      dialogs.open(TypedDataDialog);

      expect(document.querySelector('#typed-null')!.textContent).toBe('null');
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
    it('resolves the closed promise with { reason, result }', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, 'confirm' | 'cancel', ConfirmData>(ConfirmDialog, {
        data: { message: 'x' },
      });

      document.querySelector<HTMLButtonElement>('#ok')!.click();

      const { reason, result } = await ref.closed;
      expect(result).toBe('confirm');
      expect(reason).toBe('programmatic');
    });

    it('reflects result and isClosed reactively', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, 'confirm' | 'cancel', ConfirmData>(ConfirmDialog, {
        data: { message: 'x' },
      });

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
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('detaches the host before focus returns to the trigger on close', async () => {
      const { dialogs, trigger } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      const host = document.querySelector('[role="dialog"]')!;

      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(host.isConnected).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('is idempotent: a second close is a no-op', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, string>(ConfirmDialog, {
        data: { message: 'x' },
      });

      ref.close('first');
      ref.close('second'); // ignored
      const { result } = await ref.closed;

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
      TestBed.tick();

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
      TestBed.tick();

      expect(document.activeElement).not.toBe(trigger);
    });

    it('falls back to focusing the host when no focusable exists', () => {
      const { dialogs } = setup();
      dialogs.open(FocusableLessDialog);
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(document.activeElement).toBe(host);
    });

    it('skips initial focus when autoFocusOnOpen calls preventDefault', () => {
      const { dialogs, trigger } = setup();
      trigger.focus();
      dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        autoFocusOnOpen: (event) => event.preventDefault(),
      });

      // Trap was set up but the imperative `.focus()` was skipped.
      expect(document.activeElement).toBe(trigger);
    });

    it('skips return-focus when autoFocusOnClose calls preventDefault', async () => {
      const { dialogs, trigger } = setup();
      trigger.focus();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        autoFocusOnClose: (event) => event.preventDefault(),
      });

      // Park focus elsewhere so we can detect whether the trap restored it.
      const sentinel = document.createElement('button');
      sentinel.id = 'sentinel';
      document.body.appendChild(sentinel);
      sentinel.focus();

      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.activeElement?.id).toBe('sentinel');
      sentinel.remove();
    });
  });

  describe('Escape key', () => {
    it('closes a dismissible dialog and resolves with undefined', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<ConfirmDialog, string | undefined>(ConfirmDialog, {
        data: { message: 'x' },
      });

      pressKey(document, 'Escape');
      const { reason, result } = await ref.closed;

      expect(result).toBeUndefined();
      expect(reason).toBe('escape');
      expect(ref.isClosed()).toBe(true);
    });

    it('is ignored when dismissible: false', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        dismissible: false,
      });

      pressKey(document, 'Escape');
      expect(ref.isClosed()).toBe(false);

      ref.close();
    });
  });

  describe('body scroll lock', () => {
    it('locks while modal dialog is open and clears the inline style on close', async () => {
      // Pre-existing inline overflow is intentionally NOT restored on close:
      // BodyScrollLock clears the inline style and lets the cascade take over.
      // See body-scroll-lock.ts and #149 for rationale.
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(document.body.style.overflow).toBe('hidden');

      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.body.style.overflow).toBe('');
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
      // Pre-existing inline overflow is intentionally NOT restored when the
      // last dialog closes: BodyScrollLock clears the inline style and lets
      // the cascade take over. See body-scroll-lock.ts and #149 for rationale.
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      const a = dialogs.open(ConfirmDialog, { data: { message: 'a' } });
      const b = dialogs.open(ConfirmDialog, { data: { message: 'b' } });

      expect(document.body.style.overflow).toBe('hidden');

      a.close();
      await a.closed;
      TestBed.tick();
      expect(document.body.style.overflow).toBe('hidden');

      b.close();
      await b.closed;
      TestBed.tick();
      expect(document.body.style.overflow).toBe('');
    });

    it('Escape only closes the topmost stacked dialog', async () => {
      const { dialogs } = setup();
      const a = dialogs.open<ConfirmDialog, string | undefined>(ConfirmDialog, {
        data: { message: 'a' },
      });
      const b = dialogs.open<ConfirmDialog, string | undefined>(ConfirmDialog, {
        data: { message: 'b' },
      });

      pressKey(document, 'Escape');
      await b.closed;

      expect(b.isClosed()).toBe(true);
      expect(a.isClosed()).toBe(false);

      pressKey(document, 'Escape');
      await a.closed;

      expect(a.isClosed()).toBe(true);
    });

    it('closing an underlying dialog does NOT cascade-close the dialog above', async () => {
      const { dialogs } = setup();
      const a = dialogs.open(ConfirmDialog, { data: { message: 'a' } });
      const b = dialogs.open(ConfirmDialog, { data: { message: 'b' } });

      a.close();
      await a.closed;

      expect(a.isClosed()).toBe(true);
      expect(b.isClosed()).toBe(false);

      b.close();
    });
  });

  describe('dismissable-layer parity with [forDialog]', () => {
    it('dismisses on outside pointer-down when dismissible (default)', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);

      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      await ref.closed;
      TestBed.tick();

      expect(ref.isClosed()).toBe(true);
      outside.remove();
    });

    it('does NOT dismiss on outside pointer-down when dismissible: false', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        dismissible: false,
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);

      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(ref.isClosed()).toBe(false);
      outside.remove();
      ref.close();
    });

    it('does NOT dismiss on pointer-down INSIDE the dialog', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      const okButton = document.querySelector<HTMLButtonElement>('#ok')!;
      okButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(ref.isClosed()).toBe(false);
      ref.close();
    });

    it('uses the shared focusable selector — focuses an <a href> link first', () => {
      @Component({
        template: `
          <a id="link" href="#nope">link</a>
          <button id="btn">btn</button>
        `,
      })
      class LinkFirstDialog {}

      const { dialogs } = setup();
      dialogs.open(LinkFirstDialog);

      // The shared FOCUSABLE_SELECTOR (now used by both the manager and
      // the directive) lists `a[href]` — any pre-existing manager-only
      // selector is gone, so a leading link should be picked up first.
      expect(document.activeElement?.id).toBe('link');
    });
  });

  // ---- New coverage for #678 — per-channel dismiss hooks on the manager ----

  describe('per-channel dismiss hooks (#678)', () => {
    // The whole suite runs under `provideZonelessChangeDetection()` (see
    // `setup()`), so this block doubles as the zoneless coverage for the hooks.
    it('interactOutside veto keeps a dismissible dialog open on outside pointer-down while Escape still closes', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        interactOutside: (event) => event.preventDefault(),
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      // Vetoed: the outside interaction does not dismiss.
      expect(ref.isClosed()).toBe(false);

      // Escape is a separate channel with its own veto — still closes.
      pressKey(document, 'Escape');
      await ref.closed;
      expect(ref.isClosed()).toBe(true);

      outside.remove();
    });

    it('pointerDownOutside veto suppresses the outside-click close', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        pointerDownOutside: (event) => event.preventDefault(),
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(ref.isClosed()).toBe(false);

      outside.remove();
      ref.close();
    });

    it('escapeKeyDown veto suppresses the Escape close', () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        escapeKeyDown: (event) => event.preventDefault(),
      });

      pressKey(document, 'Escape');
      expect(ref.isClosed()).toBe(false);

      ref.close();
    });

    it('passes the originating DOM events to the callbacks (parity with the declarative outputs)', () => {
      const { dialogs } = setup();
      let escapeEvent: Event | undefined;
      let pointerEvent: Event | undefined;
      let interactEvent: Event | undefined;
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        escapeKeyDown: (event) => {
          escapeEvent = event.event;
          event.preventDefault();
        },
        pointerDownOutside: (event) => {
          pointerEvent = event.event;
          event.preventDefault();
        },
        interactOutside: (event) => {
          interactEvent = event.event;
        },
      });

      const outside = document.createElement('div');
      outside.id = 'outside';
      document.body.appendChild(outside);
      const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      outside.dispatchEvent(pointerDown);

      // The pointer channel and the composite channel share the same physical
      // interaction, so both receive the exact DOM event the layer observed.
      expect(pointerEvent).toBe(pointerDown);
      expect(interactEvent).toBe(pointerDown);

      pressKey(document, 'Escape');
      expect(escapeEvent).toBeInstanceOf(KeyboardEvent);

      // All channels vetoed → still open.
      expect(ref.isClosed()).toBe(false);

      outside.remove();
      ref.close();
    });
  });

  // ---- New coverage for #206 — manager runs `[forDialog]` for real ----

  describe('child pieces work inside the opened component', () => {
    @Component({
      imports: [ForDialogTitle, ForDialogDescription, ForDialogBackdrop, ForDialogClose],
      template: `
        <div data-testid="bd" forDialogBackdrop></div>
        <h2 data-testid="title" forDialogTitle>Title</h2>
        <p data-testid="desc" forDialogDescription>Desc</p>
        <button id="close-with" forDialogClose [closeWith]="payload">Close</button>
      `,
    })
    class FullPiecesDialog {
      readonly payload = { reason: 'user-confirmed' };
    }

    it('wires aria-labelledby and aria-describedby from forDialogTitle / forDialogDescription', () => {
      const { dialogs } = setup();
      dialogs.open(FullPiecesDialog);
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const title = document.querySelector<HTMLElement>('[data-testid="title"]')!;
      const desc = document.querySelector<HTMLElement>('[data-testid="desc"]')!;
      expect(host.getAttribute('aria-labelledby')).toBe(title.id);
      expect(host.getAttribute('aria-describedby')).toBe(desc.id);
    });

    it('forDialogBackdrop is registered (markers and data-state mirror the directive)', () => {
      const { dialogs } = setup();
      dialogs.open(FullPiecesDialog);
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;
      expect(backdrop.getAttribute('data-state')).toBe('open');
      expect(backdrop.hasAttribute('data-for-modal-peer')).toBe(true);
    });

    it('forDialogClose actually closes a programmatic dialog (was a silent no-op pre-#206)', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(FullPiecesDialog);
      document.querySelector<HTMLButtonElement>('#close-with')!.click();
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
    });

    it('forDialogClose [closeWith] propagates the payload to ForDialogRef.close(value)', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open<FullPiecesDialog, { reason: string }>(FullPiecesDialog);
      document.querySelector<HTMLButtonElement>('#close-with')!.click();
      const closeEvent = await ref.closed;
      expect(closeEvent.result).toEqual({ reason: 'user-confirmed' });
      expect(closeEvent.reason).toBe('closeButton');
      expect(ref.result()).toEqual({ reason: 'user-confirmed' });
    });

    it('forDialogBackdrop click closes a dismissible programmatic dialog with reason backdrop', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(FullPiecesDialog);
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;
      backdrop.click();
      const { reason } = await ref.closed;
      expect(ref.isClosed()).toBe(true);
      expect(reason).toBe('backdrop');
    });
  });

  describe('host attribute single-source-of-truth', () => {
    it('emits a single role / aria-modal / tabindex / data-state (no duplication)', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      const hosts = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      expect(hosts.length).toBe(1);
      const host = hosts[0]!;
      expect(host.getAttribute('aria-modal')).toBe('true');
      expect(host.getAttribute('tabindex')).toBe('-1');
      expect(host.getAttribute('data-state')).toBe('open');
    });

    it('modal: false drops aria-modal and skips scroll lock', () => {
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, modal: false });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.hasAttribute('aria-modal')).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('defaults provider (root scope)', () => {
    it('behavior key from provideForDialogDefaults applies when config omits it', () => {
      document.body.style.overflow = 'auto';
      const { dialogs } = setup({ providers: [provideForDialogDefaults({ modal: false })] });
      dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.hasAttribute('aria-modal')).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
    });

    it('config option overrides the defaults provider', () => {
      const { dialogs } = setup({ providers: [provideForDialogDefaults({ modal: false })] });
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, modal: true });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('aria-modal')).toBe('true');
    });

    it('returnFocus:false from the provider takes effect', async () => {
      const { dialogs, trigger } = setup({
        providers: [provideForDialogDefaults({ returnFocus: false })],
      });
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      ref.close();
      await ref.closed;
      TestBed.tick();
      expect(document.activeElement).not.toBe(trigger);
    });
  });

  // ---- New coverage for #1232 — per-scope defaults + DI via open({ injector }) ----

  describe('scoped defaults via open({ injector }) (#1232)', () => {
    // The whole suite runs under `provideZonelessChangeDetection()` (see
    // `setup()`), so this block doubles as the zoneless coverage for the
    // scoped-vs-root resolution.
    const SCOPED_TOKEN = new InjectionToken<string>('SCOPED_DIALOG_TEST_TOKEN');

    @Component({
      template: ``,
      providers: [
        provideForDialogDefaults({ modal: false }),
        { provide: SCOPED_TOKEN, useValue: 'from-scope' },
      ],
    })
    class ScopedHost {
      readonly injector = inject(Injector);
    }

    @Component({ template: `<p id="scoped">{{ scoped }}</p>` })
    class ScopeReadingDialog {
      readonly scoped = inject(SCOPED_TOKEN, { optional: true }) ?? 'none';
    }

    function scopedInjector(): Injector {
      return TestBed.createComponent(ScopedHost).componentInstance.injector;
    }

    it('resolves a scoped provideForDialogDefaults when injector is passed', () => {
      document.body.style.overflow = 'auto';
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, injector: scopedInjector() });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.hasAttribute('aria-modal')).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
    });

    it('does NOT reach the scoped defaults without injector (root behavior unchanged)', () => {
      const { dialogs } = setup();
      // Build the scope so its provider exists, but do not hand it to open().
      scopedInjector();
      dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('aria-modal')).toBe('true');
    });

    it('per-open config still wins over the scoped default', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        modal: true,
        injector: scopedInjector(),
      });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('aria-modal')).toBe('true');
    });

    it('the opened component resolves DI from the passed scope injector', () => {
      const { dialogs } = setup();
      dialogs.open(ScopeReadingDialog, { injector: scopedInjector() });
      expect(document.querySelector('#scoped')!.textContent).toBe('from-scope');
    });

    it('the opened component sees no scope DI without an injector', () => {
      const { dialogs } = setup();
      dialogs.open(ScopeReadingDialog);
      expect(document.querySelector('#scoped')!.textContent).toBe('none');
    });

    it('child pieces still wire aria under a scope injector (context copied across)', () => {
      @Component({
        imports: [ForDialogTitle, ForDialogDescription],
        template: `
          <h2 data-testid="title" forDialogTitle>Title</h2>
          <p data-testid="desc" forDialogDescription>Desc</p>
        `,
      })
      class PiecesDialog {}

      const { dialogs } = setup();
      dialogs.open(PiecesDialog, { injector: scopedInjector() });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const title = document.querySelector<HTMLElement>('[data-testid="title"]')!;
      const desc = document.querySelector<HTMLElement>('[data-testid="desc"]')!;
      expect(host.getAttribute('aria-labelledby')).toBe(title.id);
      expect(host.getAttribute('aria-describedby')).toBe(desc.id);
    });
  });

  describe('consumer class (open({ class }) / classList)', () => {
    it('applies a single class to the overlay root', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, class: 'my-dialog' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-dialog')).toBe(true);
    });

    it('applies a space-separated class string', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, class: 'my-dialog my-dialog--pop' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-dialog')).toBe(true);
      expect(host.classList.contains('my-dialog--pop')).toBe(true);
    });

    it('applies an array via classList', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, classList: ['my-dialog', 'pop'] });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.classList.contains('my-dialog')).toBe(true);
      expect(host.classList.contains('pop')).toBe(true);
    });

    it('merges and de-dups class + classList', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        class: 'a b',
        classList: ['b', 'c'],
      });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.className.split(/\s+/).filter(Boolean).sort()).toEqual(['a', 'b', 'c']);
    });

    it('does not clobber the directive-owned host attributes', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' }, alert: true, class: 'my-dialog' });
      const host = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
      expect(host.classList.contains('my-dialog')).toBe(true);
      expect(host.getAttribute('data-state')).toBe('open');
      expect(host.getAttribute('role')).toBe('alertdialog');
      expect(host.getAttribute('aria-modal')).toBe('true');
      expect(host.getAttribute('tabindex')).toBe('-1');
    });

    it('leaves the host class-less when neither class nor classList is set', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, { data: { message: 'x' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.className).toBe('');
    });
  });

  describe('exit-animation / control-flow contract (#677)', () => {
    it('isClosed() flips true and closed promise resolves immediately on close', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(ref.isClosed()).toBe(false);
      ref.close();
      expect(ref.isClosed()).toBe(true);
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
    });

    it('host is removed from document.body after a CD cycle (one TestBed.tick)', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('closing one of N dialogs leaves the others mounted', async () => {
      const { dialogs } = setup();
      const a = dialogs.open(ConfirmDialog, { data: { message: 'a' } });
      const b = dialogs.open(ConfirmDialog, { data: { message: 'b' } });

      a.close();
      await a.closed;
      TestBed.tick();

      expect(a.isClosed()).toBe(true);
      expect(b.isClosed()).toBe(false);
      expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);

      b.close();
    });

    it('zoneless open + close (provideZonelessChangeDetection)', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, { data: { message: 'x' } });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('accepts animateEnter / animateLeave config and mounts', () => {
      const { dialogs } = setup();
      dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        animateEnter: 'dialog-in',
        animateLeave: 'dialog-out',
      });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  // ---- Backdrop exit animation under the manager ----
  // A backdrop declared inside the opened component plays its `animate.enter`
  // on mount but cannot run a template `animate.leave` (Angular does not
  // process leave animations across the `ngComponentOutlet` the manager mounts
  // the component through), so the manager drives the backdrop's exit class in
  // lockstep with the host — matched by a shared per-instance id.
  describe('backdrop exit animation (backdropAnimateLeave)', () => {
    @Component({
      imports: [ForDialogBackdrop],
      template: `
        <div data-testid="bd" forDialogBackdrop></div>
        <button id="ok">OK</button>
      `,
    })
    class BackdropDialog {}

    it('pairs the portaled backdrop with its dialog via data-for-dialog-id', () => {
      const { dialogs } = setup();
      dialogs.open(BackdropDialog);
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;
      const id = host.getAttribute('data-for-dialog-id');
      expect(id).toBeTruthy();
      expect(backdrop.getAttribute('data-for-dialog-id')).toBe(id);
    });

    it('drives the backdrop exit class in lockstep with the host on close', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(BackdropDialog, {
        animateLeave: 'dialog-out',
        backdropAnimateLeave: 'backdrop-out',
      });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const backdrop = document.querySelector<HTMLElement>('[data-testid="bd"]')!;

      // jsdom ships no Web Animations engine; fake a running animation so the
      // manager keeps both nodes mounted through the exit and applies the
      // classes rather than tearing down immediately.
      const running = () => [{ finished: Promise.resolve() }] as unknown as Animation[];
      host.getAnimations = running;
      backdrop.getAnimations = running;

      ref.close();

      expect(host.classList.contains('dialog-out')).toBe(true);
      expect(backdrop.classList.contains('backdrop-out')).toBe(true);

      await ref.closed;
    });

    it('closes cleanly when backdropAnimateLeave is set but no backdrop is rendered', async () => {
      const { dialogs } = setup();
      const ref = dialogs.open(ConfirmDialog, {
        data: { message: 'x' },
        backdropAnimateLeave: 'backdrop-out',
      });

      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      TestBed.tick();

      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });
  });

  describe('container (scoped programmatic dialog)', () => {
    @Component({
      imports: [ForDialogBackdrop],
      template: `
        <div forDialogBackdrop></div>
        <button id="ok">OK</button>
      `,
    })
    class ContainerBackdropDialog {}

    it('portals the surface and backdrop into the container element when modal: false', () => {
      const boxEl = document.createElement('div');
      boxEl.id = 'scoped-box';
      document.body.appendChild(boxEl);

      try {
        const { dialogs } = setup();
        dialogs.open(ContainerBackdropDialog, { modal: false, container: boxEl });
        TestBed.tick();

        const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
        const backdrop = document.querySelector<HTMLElement>('[forDialogBackdrop]')!;
        expect(host.parentElement).toBe(boxEl);
        expect(backdrop.parentElement).toBe(boxEl);
      } finally {
        boxEl.remove();
      }
    });
  });

  describe('open() from within change detection (NG0101 — #1138)', () => {
    @Component({ template: `` })
    class EffectDialogOpener {
      readonly #dialogs = inject(ForDialogManager);
      readonly openNow = signal(false);
      constructor() {
        effect(() => {
          if (this.openNow()) {
            this.#dialogs.open(ConfirmDialog, { data: { message: 'from effect' } });
          }
        });
      }
    }

    it('mounts a dialog opened from inside effect() on the next render', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(EffectDialogOpener);
      fixture.detectChanges();
      expect(document.querySelector('[role="dialog"]')).toBeNull();

      fixture.componentInstance.openNow.set(true);
      await flush(fixture);

      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(document.querySelector('#message')?.textContent).toBe('from effect');
    });
  });
});
