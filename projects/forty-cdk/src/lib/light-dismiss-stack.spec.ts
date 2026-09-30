import { Component, signal, viewChild } from '@angular/core';

import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForDialog } from 'forty-cdk/dialog';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';

import {
  afterEachOverlayCleanup,
  flush,
  pointerDownOn,
  pressKey,
  renderHost,
  type RenderResult,
} from '../test-utils';

@Component({
  imports: [
    ForContextMenu,
    ForContextMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForPopover,
    ForPopoverContent,
    ForPopoverTrigger,
  ],
  template: `
    <div
      forContextMenu
      [(open)]="menuOpen"
      ariaLabel="Chip actions"
      (pointerDownOutside)="vetoMenuPointer() && $event.preventDefault()"
      (interactOutside)="vetoMenuInteract() && $event.preventDefault()"
    >
      <div
        forPopover
        [(open)]="popoverOpen"
        [lightDismiss]="lightDismiss()"
        ariaLabel="Status filter"
      >
        <button id="chip" type="button" forPopoverTrigger forContextMenuTrigger>
          Status: open
        </button>
        @if (popoverOpen()) {
          <div forPopoverContent>
            <button id="apply" type="button">Apply</button>
          </div>
        }
      </div>
      @if (menuOpen()) {
        <div forMenuContent>
          <button id="copy" type="button" forMenuItem>Copy</button>
        </div>
      }
    </div>
    <button id="elsewhere" type="button">Elsewhere</button>
  `,
})
class ChipHost {
  readonly menuOpen = signal(false);
  readonly popoverOpen = signal(false);
  readonly lightDismiss = signal<'topmost' | 'stack'>('stack');
  readonly vetoMenuPointer = signal(false);
  readonly vetoMenuInteract = signal(false);
  readonly menu = viewChild.required(ForContextMenu);
  readonly popover = viewChild.required(ForPopover);
}

@Component({
  imports: [ForDialog, ForPopover, ForPopoverContent, ForPopoverTrigger],
  template: `
    <button id="outside-dialog" type="button">Outside</button>
    @if (dialogOpen()) {
      <div
        forDialog
        ariaLabel="Settings"
        (dismiss)="dialogOpen.set(false)"
        (pointerDownOutside)="dialogPresses = dialogPresses + 1"
      >
        <div forPopover [(open)]="popoverOpen" lightDismiss="stack" ariaLabel="Help">
          <button id="help" type="button" forPopoverTrigger>Help</button>
          @if (popoverOpen()) {
            <div forPopoverContent><p>Details</p></div>
          }
        </div>
      </div>
    }
  `,
})
class DialogHost {
  readonly dialogOpen = signal(true);
  readonly popoverOpen = signal(false);
  dialogPresses = 0;
  readonly popover = viewChild(ForPopover);
}

function rightClick(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
}

async function openBoth(): Promise<RenderResult<ChipHost>> {
  const r = renderHost(ChipHost);
  r.instance.popoverOpen.set(true);
  await flush(r.fixture);
  rightClick(r.query<HTMLElement>('#chip')!);
  await flush(r.fixture);
  expect(r.instance.popoverOpen()).toBe(true);
  expect(r.instance.menuOpen()).toBe(true);
  return r;
}

const byId = (id: string): HTMLElement => document.getElementById(id)!;

describe('lightDismiss="stack" on [forPopover] (#2060)', () => {
  afterEachOverlayCleanup();

  it('closes a context menu and the popover below it on a press outside both', async () => {
    const r = await openBoth();

    pointerDownOn(byId('elsewhere'));
    await flush(r.fixture);

    expect(r.instance.menuOpen()).toBe(false);
    expect(r.instance.popoverOpen()).toBe(false);
    expect(r.instance.menu().lastCloseReason()).toBe('pointerDownOutside');
    expect(r.instance.popover().lastCloseReason()).toBe('pointerDownOutside');
  });

  it('closes only the menu on a press inside the popover content', async () => {
    const r = await openBoth();

    pointerDownOn(byId('apply'));
    await flush(r.fixture);

    expect(r.instance.menuOpen()).toBe(false);
    expect(r.instance.popoverOpen()).toBe(true);
  });

  it("keeps both open when the menu's (pointerDownOutside) vetoes", async () => {
    const r = await openBoth();
    r.instance.vetoMenuPointer.set(true);

    pointerDownOn(byId('elsewhere'));
    await flush(r.fixture);

    expect(r.instance.menuOpen()).toBe(true);
    expect(r.instance.popoverOpen()).toBe(true);
  });

  it("keeps both open when the menu's (interactOutside) vetoes", async () => {
    const r = await openBoth();
    r.instance.vetoMenuInteract.set(true);

    pointerDownOn(byId('elsewhere'));
    await flush(r.fixture);

    expect(r.instance.menuOpen()).toBe(true);
    expect(r.instance.popoverOpen()).toBe(true);
  });

  it('leaves the popover open without the opt-in', async () => {
    const r = await openBoth();
    r.instance.lightDismiss.set('topmost');
    await flush(r.fixture);

    pointerDownOn(byId('elsewhere'));
    await flush(r.fixture);

    expect(r.instance.menuOpen()).toBe(false);
    expect(r.instance.popoverOpen()).toBe(true);
  });

  it('still closes one layer per Escape', async () => {
    const r = await openBoth();

    pressKey(byId('copy'), 'Escape');
    await flush(r.fixture);

    expect(r.instance.menuOpen()).toBe(false);
    expect(r.instance.popoverOpen()).toBe(true);
  });

  it('closes only the popover open inside a modal dialog', async () => {
    const r = renderHost(DialogHost);
    await flush(r.fixture);
    r.instance.popoverOpen.set(true);
    await flush(r.fixture);

    pointerDownOn(byId('outside-dialog'));
    await flush(r.fixture);

    expect(r.instance.popoverOpen()).toBe(false);
    expect(r.instance.popover()?.lastCloseReason()).toBe('pointerDownOutside');
    expect(r.instance.dialogOpen()).toBe(true);
    expect(r.instance.dialogPresses).toBe(0);
  });
});
