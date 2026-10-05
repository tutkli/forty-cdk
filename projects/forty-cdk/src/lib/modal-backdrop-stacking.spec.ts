import { Component, signal, type Type } from '@angular/core';

import { ForDialog, ForDialogBackdrop } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerBackdrop } from 'forty-cdk/drawer';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';

import { afterEachOverlayCleanup, flush, pointerDownOn, renderHost } from '../test-utils';

abstract class StackHostBase {
  readonly parentOpen = signal(true);
  readonly childOpen = signal(false);
  readonly popoverOpen = signal(false);
  readonly guardChild = signal(false);
  readonly parentReasons: string[] = [];
  readonly childReasons: string[] = [];

  onParentDismiss(reason: string): void {
    this.parentReasons.push(reason);
    this.parentOpen.set(false);
  }

  onChildDismiss(reason: string): void {
    this.childReasons.push(reason);
    this.childOpen.set(false);
  }
}

@Component({
  imports: [ForDialog, ForDialogBackdrop, ForPopover, ForPopoverContent, ForPopoverTrigger],
  template: `
    @if (parentOpen()) {
      <div forDialog ariaLabel="Parent" (dismiss)="onParentDismiss($event)">
        <div forDialogBackdrop id="parent-backdrop"></div>
        <div forPopover [(open)]="popoverOpen" ariaLabel="Help">
          <button type="button" forPopoverTrigger>Help</button>
          @if (popoverOpen()) {
            <div forPopoverContent><p>Details</p></div>
          }
        </div>
        @if (childOpen()) {
          <div
            forDialog
            ariaLabel="Child"
            (dismiss)="onChildDismiss($event)"
            (pointerDownOutside)="guardChild() && $event.preventDefault()"
          >
            <button type="button">Child</button>
          </div>
        }
      </div>
    }
  `,
})
class DialogStackHost extends StackHostBase {}

@Component({
  imports: [ForDrawer, ForDrawerBackdrop, ForPopover, ForPopoverContent, ForPopoverTrigger],
  template: `
    @if (parentOpen()) {
      <div forDrawer ariaLabel="Parent" (dismiss)="onParentDismiss($event)">
        <div forDrawerBackdrop id="parent-backdrop"></div>
        <div forPopover [(open)]="popoverOpen" ariaLabel="Help">
          <button type="button" forPopoverTrigger>Help</button>
          @if (popoverOpen()) {
            <div forPopoverContent><p>Details</p></div>
          }
        </div>
        @if (childOpen()) {
          <div
            forDrawer
            ariaLabel="Child"
            (dismiss)="onChildDismiss($event)"
            (pointerDownOutside)="guardChild() && $event.preventDefault()"
          >
            <button type="button">Child</button>
          </div>
        }
      </div>
    }
  `,
})
class DrawerStackHost extends StackHostBase {}

const SURFACES: ReadonlyArray<readonly [string, Type<StackHostBase>]> = [
  ['[forDialogBackdrop]', DialogStackHost],
  ['[forDrawerBackdrop]', DrawerStackHost],
];

describe.each(SURFACES)('%s under a layer stacked above its surface (#2132)', (_, host) => {
  afterEachOverlayCleanup();

  async function mount(state: Partial<Record<'childOpen' | 'popoverOpen', boolean>>) {
    const r = renderHost(host);
    await flush(r.fixture);
    if (state.childOpen) {
      r.instance.childOpen.set(true);
    }
    if (state.popoverOpen) {
      r.instance.popoverOpen.set(true);
    }
    await flush(r.fixture);
    const backdrop = document.getElementById('parent-backdrop')!;
    const press = async (): Promise<void> => {
      pointerDownOn(backdrop);
      await flush(r.fixture);
      backdrop.click();
      await flush(r.fixture);
    };
    return { r, backdrop, press };
  }

  it('closes only a child surface with no backdrop of its own', async () => {
    const { r, press } = await mount({ childOpen: true });

    await press();

    expect(r.instance.childReasons).toEqual(['pointerDownOutside']);
    expect(r.instance.childOpen()).toBe(false);
    expect(r.instance.parentReasons).toEqual([]);
    expect(r.instance.parentOpen()).toBe(true);
  });

  it("keeps both open when the child's (pointerDownOutside) vetoes", async () => {
    const { r, press } = await mount({ childOpen: true });
    r.instance.guardChild.set(true);

    await press();

    expect(r.instance.childOpen()).toBe(true);
    expect(r.instance.parentReasons).toEqual([]);
    expect(r.instance.parentOpen()).toBe(true);
  });

  it('closes only a popover open inside the surface', async () => {
    const { r, press } = await mount({ popoverOpen: true });

    await press();

    expect(r.instance.popoverOpen()).toBe(false);
    expect(r.instance.parentReasons).toEqual([]);
    expect(r.instance.parentOpen()).toBe(true);
  });

  it('ignores a click with no pointerdown while a child is stacked above', async () => {
    const { r, backdrop } = await mount({ childOpen: true });

    backdrop.click();
    await flush(r.fixture);

    expect(r.instance.parentReasons).toEqual([]);
    expect(r.instance.parentOpen()).toBe(true);
  });

  it('closes the surface with reason "backdrop" once it is the topmost layer again', async () => {
    const { r, press } = await mount({ childOpen: true });
    await press();
    expect(r.instance.childOpen()).toBe(false);

    await press();

    expect(r.instance.parentReasons).toEqual(['backdrop']);
    expect(r.instance.parentOpen()).toBe(false);
  });
});
