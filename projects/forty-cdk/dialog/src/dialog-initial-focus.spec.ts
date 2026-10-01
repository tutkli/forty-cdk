import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type VetoableEvent } from 'forty-cdk/core';
import { pressKey } from 'forty-cdk/testing';
import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForDialog } from './dialog';
import { ForDialogClose } from './dialog-close';
import { ForDialogInitialFocus } from './dialog-initial-focus';
import { ForDialogManager } from './dialog-manager';
import { ForDialogTitle } from './dialog-title';

type Variant = 'cancel' | 'none' | 'disabled' | 'hidden' | 'display-none' | 'heading' | 'two';

@Component({
  imports: [ForDialog, ForDialogTitle, ForDialogClose, ForDialogInitialFocus],
  host: { 'data-fixture': 'dialog-initial-focus-host' },
  template: `
    <button id="opener" type="button" (click)="open.set(true)">Open</button>
    @if (open()) {
      <div
        forDialog
        [modal]="modal()"
        [initialFocus]="initialFocus()"
        [autoFocusOnOpen]="onOpen()"
        (dismiss)="open.set(false)"
      >
        @if (variant() === 'heading') {
          <h2 id="heading" tabindex="-1" forDialogTitle forDialogInitialFocus>Delete view</h2>
        } @else {
          <h2 forDialogTitle>Delete view</h2>
        }
        <button id="close" type="button" forDialogClose aria-label="Close">×</button>
        <p>This cannot be undone.</p>
        @switch (variant()) {
          @case ('cancel') {
            <button id="cancel" type="button" forDialogClose forDialogInitialFocus>Cancel</button>
          }
          @case ('disabled') {
            <button id="cancel" type="button" disabled forDialogInitialFocus>Cancel</button>
          }
          @case ('hidden') {
            <button id="cancel" type="button" hidden forDialogInitialFocus>Cancel</button>
          }
          @case ('display-none') {
            <button id="cancel" type="button" style="display: none" forDialogInitialFocus>
              Cancel
            </button>
          }
          @case ('two') {
            <button id="cancel" type="button" forDialogInitialFocus>Cancel</button>
            <button id="other" type="button" forDialogInitialFocus>Other</button>
          }
          @default {
            <button id="cancel" type="button">Cancel</button>
          }
        }
        <button id="delete" type="button">Delete</button>
      </div>
    }
  `,
})
class InitialFocusHost {
  readonly open = signal(false);
  readonly modal = signal(true);
  readonly initialFocus = signal<'first' | 'container'>('first');
  readonly variant = signal<Variant>('cancel');
  readonly onOpen = signal<((event: VetoableEvent) => void) | undefined>(undefined);
}

@Component({
  imports: [ForDialogTitle, ForDialogClose, ForDialogInitialFocus],
  host: { 'data-fixture': 'managed-initial-focus-dialog' },
  template: `
    <h2 forDialogTitle>Delete view</h2>
    <button id="close" type="button" forDialogClose aria-label="Close">×</button>
    <button id="cancel" type="button" forDialogClose forDialogInitialFocus>Cancel</button>
    <button id="delete" type="button">Delete</button>
  `,
})
class ManagedInitialFocusDialog {}

async function openWith(
  setup: (host: InitialFocusHost) => void,
): Promise<ReturnType<typeof renderHost<InitialFocusHost>>> {
  const r = renderHost(InitialFocusHost);
  setup(r.instance);
  document.querySelector<HTMLElement>('#opener')!.focus();
  r.instance.open.set(true);
  await flush(r.fixture);
  return r;
}

describe('ForDialogInitialFocus (#2056)', () => {
  afterEachOverlayCleanup();

  it('focuses the marked element when a modal dialog opens', async () => {
    await openWith(() => undefined);

    expect(document.activeElement?.id).toBe('cancel');
  });

  it('focuses the marked element when a non-modal dialog opens', async () => {
    await openWith((host) => host.modal.set(false));

    expect(document.activeElement?.id).toBe('cancel');
  });

  it('focuses a static heading carrying tabindex="-1"', async () => {
    await openWith((host) => host.variant.set('heading'));

    expect(document.activeElement?.id).toBe('heading');
  });

  it('falls back to initialFocus when no marker is rendered', async () => {
    await openWith((host) => host.variant.set('none'));

    expect(document.activeElement?.id).toBe('close');
  });

  it('falls back to the container when no marker is rendered and initialFocus is container', async () => {
    await openWith((host) => {
      host.variant.set('none');
      host.initialFocus.set('container');
    });

    expect(document.activeElement).toBe(document.querySelector('[forDialog]'));
  });

  for (const variant of ['disabled', 'hidden', 'display-none'] as const) {
    it(`falls back to initialFocus when the marked element is ${variant}`, async () => {
      await openWith((host) => host.variant.set(variant));

      expect(document.activeElement?.id).toBe('close');
    });
  }

  it('skips the move when autoFocusOnOpen is vetoed', async () => {
    await openWith((host) => host.onOpen.set((event) => event.preventDefault()));

    expect(document.activeElement?.id).toBe('opener');
  });

  it('keeps Tab cycling inside the modal dialog from the marked element', async () => {
    await openWith(() => undefined);
    document.querySelector<HTMLElement>('#delete')!.focus();

    pressKey(document.activeElement!, 'Tab');

    expect(document.activeElement?.id).toBe('close');
  });

  it('returns focus to the opener on close', async () => {
    const r = await openWith(() => undefined);

    r.instance.open.set(false);
    await flush(r.fixture);

    expect(document.activeElement?.id).toBe('opener');
  });

  it('warns in dev mode when a second marker registers, and focuses the newest one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await openWith((host) => host.variant.set('two'));

    const duplicates = warn.mock.calls.filter(([message]) =>
      String(message).includes('FORCDK-CORE-005'),
    );
    expect(duplicates).toHaveLength(1);
    expect(String(duplicates[0]![0])).toContain('[forDialogInitialFocus]');
    expect(document.activeElement?.id).toBe('other');
  });

  it('focuses the marked element inside a component opened with ForDialogManager', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.inject(ForDialogManager).open(ManagedInitialFocusDialog);
    TestBed.tick();

    expect(document.activeElement?.id).toBe('cancel');
  });
});
