import { Component, signal } from '@angular/core';

import { type VetoableEvent } from 'forty-cdk/core';
import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForPopover } from './popover';
import { ForPopoverClose } from './popover-close';
import { ForPopoverContent } from './popover-content';
import { ForPopoverInitialFocus } from './popover-initial-focus';
import { ForPopoverTitle } from './popover-title';
import { ForPopoverTrigger } from './popover-trigger';

@Component({
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverClose,
    ForPopoverInitialFocus,
  ],
  host: { 'data-fixture': 'popover-initial-focus-host' },
  template: `
    <div
      forPopover
      [(open)]="open"
      [initialFocus]="initialFocus()"
      (autoFocusOnOpen)="onOpen($event)"
    >
      <button id="trigger" type="button" forPopoverTrigger>Settings</button>
      @if (open()) {
        <div forPopoverContent>
          <h2 forPopoverTitle>Settings</h2>
          <button id="close" type="button" forPopoverClose aria-label="Close">×</button>
          @if (marked()) {
            <button id="save" type="button" [disabled]="disabled()" forPopoverInitialFocus>
              Save
            </button>
          } @else {
            <button id="save" type="button">Save</button>
          }
        </div>
      }
    </div>
  `,
})
class PopoverInitialFocusHost {
  readonly open = signal(false);
  readonly initialFocus = signal<'first' | 'container'>('first');
  readonly marked = signal(true);
  readonly disabled = signal(false);
  readonly veto = signal(false);

  onOpen(event: VetoableEvent): void {
    if (this.veto()) {
      event.preventDefault();
    }
  }
}

async function openWith(setup: (host: PopoverInitialFocusHost) => void): Promise<void> {
  const r = renderHost(PopoverInitialFocusHost);
  setup(r.instance);
  document.querySelector<HTMLElement>('#trigger')!.focus();
  r.instance.open.set(true);
  await flush(r.fixture);
}

describe('ForPopoverInitialFocus (#2056)', () => {
  afterEachOverlayCleanup();

  it('focuses the marked element when the popover opens', async () => {
    await openWith(() => undefined);

    expect(document.activeElement?.id).toBe('save');
  });

  it('falls back to initialFocus when no marker is rendered', async () => {
    await openWith((host) => host.marked.set(false));

    expect(document.activeElement?.id).toBe('close');
  });

  it('falls back to the content when no marker is rendered and initialFocus is container', async () => {
    await openWith((host) => {
      host.marked.set(false);
      host.initialFocus.set('container');
    });

    expect(document.activeElement).toBe(document.querySelector('[forPopoverContent]'));
  });

  it('falls back to initialFocus when the marked element is disabled', async () => {
    await openWith((host) => host.disabled.set(true));

    expect(document.activeElement?.id).toBe('close');
  });

  it('skips the move when autoFocusOnOpen is vetoed', async () => {
    await openWith((host) => host.veto.set(true));

    expect(document.activeElement?.id).toBe('trigger');
  });
});
