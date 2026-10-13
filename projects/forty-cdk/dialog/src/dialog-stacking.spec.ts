import { Component, inject, signal } from '@angular/core';

import { pressKey } from 'forty-cdk/testing';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForDialog } from './dialog';
import type { ForDialogCloseReason } from './dialog-context';
import { ForDialogManager } from './dialog-manager';

@Component({
  imports: [ForDialog],
  template: `
    @if (parentOpen()) {
      <div forDialog id="parent-dialog" ariaLabel="Parent" (dismiss)="onParentClose($event)">
        <button id="parent-first" type="button">Parent first</button>
        @if (childOpen()) {
          <div forDialog id="child-dialog" ariaLabel="Child" (dismiss)="onChildClose($event)">
            <button id="child-first" type="button">Child first</button>
            @if (grandchildOpen()) {
              <div forDialog id="grandchild-dialog" ariaLabel="Grandchild">
                <button id="grandchild-first" type="button">Grandchild first</button>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
class NestedDialogsHost {
  readonly parentOpen = signal(false);
  readonly childOpen = signal(false);
  readonly grandchildOpen = signal(false);
  readonly parentReasons: ForDialogCloseReason[] = [];
  readonly childReasons: ForDialogCloseReason[] = [];

  onParentClose(reason: ForDialogCloseReason): void {
    this.parentReasons.push(reason);
    this.parentOpen.set(false);
    this.childOpen.set(false);
  }

  onChildClose(reason: ForDialogCloseReason): void {
    this.childReasons.push(reason);
    this.childOpen.set(false);
  }
}

@Component({
  imports: [ForDialog, ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    @if (dialogOpen()) {
      <div forDialog id="outer" ariaLabel="Outer" (dismiss)="dialogOpen.set(false)">
        <div forPopover [(open)]="popoverOpen">
          <button id="popover-trigger" forPopoverTrigger>Details</button>
          @if (popoverOpen()) {
            <div forPopoverContent id="popover-content" ariaLabel="Details">
              <button id="confirm" type="button" (click)="confirmOpen.set(true)">Delete</button>
              <button id="popover-second" type="button">Cancel</button>
            </div>
          }
        </div>
        @if (confirmOpen()) {
          <div
            forDialog
            id="confirm-dialog"
            [alert]="true"
            [dismissible]="false"
            ariaLabel="Confirm"
          >
            <button id="confirm-yes" type="button">Yes</button>
          </div>
        }
      </div>
    }
  `,
})
class PopoverInDialogHost {
  readonly dialogOpen = signal(false);
  readonly popoverOpen = signal(false);
  readonly confirmOpen = signal(false);
}

@Component({
  imports: [ForDialog],
  template: `
    @if (outerOpen()) {
      <div forDialog id="outer" ariaLabel="Outer" (dismiss)="outerOpen.set(false)">
        <button id="open-floater" type="button" (click)="floaterOpen.set(true)">Help</button>
        @if (floaterOpen()) {
          <div
            forDialog
            id="floater"
            [modal]="false"
            ariaLabel="Floater"
            (dismiss)="floaterOpen.set(false)"
          >
            <button id="got-it" type="button">Got it</button>
          </div>
        }
        @if (nestedOpen()) {
          <div forDialog id="nested" ariaLabel="Nested">
            <button id="nested-first" type="button">Nested first</button>
          </div>
        }
      </div>
    }
  `,
})
class FloaterHost {
  readonly outerOpen = signal(false);
  readonly floaterOpen = signal(false);
  readonly nestedOpen = signal(false);
}

@Component({
  template: `<button id="help-ok" type="button">OK</button>`,
})
class HelpPanel {}

@Component({
  imports: [ForDialog],
  template: `
    @if (outerOpen()) {
      <div forDialog id="outer" ariaLabel="Outer">
        <button id="open-help" type="button" (click)="openHelp()">Help</button>
      </div>
    }
  `,
})
class ManagerFloaterHost {
  readonly outerOpen = signal(false);
  readonly #manager = inject(ForDialogManager);

  openHelp(): void {
    this.#manager.open(HelpPanel, { modal: false, ariaLabel: 'Help' });
  }
}

function el(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function isInerted(node: HTMLElement): boolean {
  return node.closest('[inert]') !== null || node.closest('[aria-hidden="true"]') !== null;
}

describe('modal stacking across one render pass', () => {
  afterEachOverlayCleanup();

  it('keeps the child dialog live when parent and child mount in the same pass', async () => {
    const r = renderHost(NestedDialogsHost);
    r.instance.parentOpen.set(true);
    r.instance.childOpen.set(true);
    await flush(r.fixture);

    expect(isInerted(el('child-dialog'))).toBe(false);
    expect(el('parent-dialog').hasAttribute('inert')).toBe(true);
    expect(document.activeElement?.id).toBe('child-first');
  });

  it('closes the child first on Escape when both dialogs mount in the same pass', async () => {
    const r = renderHost(NestedDialogsHost);
    r.instance.parentOpen.set(true);
    r.instance.childOpen.set(true);
    await flush(r.fixture);

    pressKey(document, 'Escape');
    await flush(r.fixture);

    expect(r.instance.childReasons).toEqual(['escape']);
    expect(r.instance.parentReasons).toEqual([]);
    expect(document.getElementById('parent-dialog')).not.toBeNull();
  });

  it('orders three nested dialogs mounted in one pass by their nesting', async () => {
    const r = renderHost(NestedDialogsHost);
    r.instance.parentOpen.set(true);
    r.instance.childOpen.set(true);
    r.instance.grandchildOpen.set(true);
    await flush(r.fixture);

    expect(isInerted(el('grandchild-dialog'))).toBe(false);
    expect(el('child-dialog').hasAttribute('inert')).toBe(true);
    expect(el('parent-dialog').hasAttribute('inert')).toBe(true);
    expect(document.activeElement?.id).toBe('grandchild-first');
  });

  it('keeps an open popover live when its enclosing dialog mounts in the same pass', async () => {
    const r = renderHost(PopoverInDialogHost);
    r.instance.dialogOpen.set(true);
    r.instance.popoverOpen.set(true);
    await flush(r.fixture);

    const content = el('popover-content');
    expect(content.parentElement).toBe(document.body);
    expect(isInerted(content)).toBe(false);
  });

  it('dismisses the popover, not the dialog, on Escape when both mount in the same pass', async () => {
    const r = renderHost(PopoverInDialogHost);
    r.instance.dialogOpen.set(true);
    r.instance.popoverOpen.set(true);
    await flush(r.fixture);

    pressKey(document, 'Escape');
    await flush(r.fixture);

    expect(r.instance.popoverOpen()).toBe(false);
    expect(r.instance.dialogOpen()).toBe(true);
  });
});

describe('non-modal surface opened from inside a modal', () => {
  afterEachOverlayCleanup();

  it('leaves a declarative non-modal dialog opened from the modal live', async () => {
    const r = renderHost(FloaterHost);
    r.instance.outerOpen.set(true);
    await flush(r.fixture);

    el('open-floater').click();
    await flush(r.fixture);
    await Promise.resolve();
    await flush(r.fixture);

    const floater = el('floater');
    expect(floater.parentElement).toBe(document.body);
    expect(floater.hasAttribute('inert')).toBe(false);
    expect(floater.hasAttribute('aria-hidden')).toBe(false);
  });

  it('leaves a manager-opened non-modal dialog opened from the modal live', async () => {
    const r = renderHost(ManagerFloaterHost);
    r.instance.outerOpen.set(true);
    await flush(r.fixture);

    el('open-help').focus();
    el('open-help').click();
    await flush(r.fixture);
    await Promise.resolve();
    await flush(r.fixture);

    expect(isInerted(el('help-ok'))).toBe(false);
  });

  it('inerts the non-modal dialog again once a nested modal opens above the outer one', async () => {
    const r = renderHost(FloaterHost);
    r.instance.outerOpen.set(true);
    await flush(r.fixture);
    el('open-floater').click();
    await flush(r.fixture);

    r.instance.nestedOpen.set(true);
    await flush(r.fixture);
    await Promise.resolve();
    await flush(r.fixture);

    expect(el('floater').hasAttribute('inert')).toBe(true);
    expect(isInerted(el('nested'))).toBe(false);
  });

  it('restores the non-modal dialog when the nested modal closes', async () => {
    const r = renderHost(FloaterHost);
    r.instance.outerOpen.set(true);
    await flush(r.fixture);
    el('open-floater').click();
    await flush(r.fixture);
    r.instance.nestedOpen.set(true);
    await flush(r.fixture);

    r.instance.nestedOpen.set(false);
    await flush(r.fixture);

    expect(el('floater').hasAttribute('inert')).toBe(false);
    expect(el('floater').hasAttribute('aria-hidden')).toBe(false);
  });
});

describe('peer of a background modal under a nested modal', () => {
  afterEachOverlayCleanup();

  it('inerts the outer dialog popover while a nested confirm dialog is open', async () => {
    const r = renderHost(PopoverInDialogHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);
    r.instance.popoverOpen.set(true);
    await flush(r.fixture);
    expect(isInerted(el('popover-content'))).toBe(false);

    r.instance.confirmOpen.set(true);
    await flush(r.fixture);

    expect(el('popover-content').hasAttribute('inert')).toBe(true);
    expect(el('popover-content').getAttribute('aria-hidden')).toBe('true');
    expect(isInerted(el('confirm-dialog'))).toBe(false);
  });

  it('pulls Tab back into the nested dialog from the background popover', async () => {
    const r = renderHost(PopoverInDialogHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);
    r.instance.popoverOpen.set(true);
    await flush(r.fixture);
    r.instance.confirmOpen.set(true);
    await flush(r.fixture);

    el('confirm').focus();
    pressKey(document, 'Tab');
    await flush(r.fixture);

    expect(document.activeElement?.id).toBe('confirm-yes');
  });

  it('lifts the background popover again when the nested dialog closes', async () => {
    const r = renderHost(PopoverInDialogHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);
    r.instance.popoverOpen.set(true);
    await flush(r.fixture);
    r.instance.confirmOpen.set(true);
    await flush(r.fixture);

    r.instance.confirmOpen.set(false);
    await flush(r.fixture);

    expect(r.instance.popoverOpen()).toBe(true);
    expect(isInerted(el('popover-content'))).toBe(false);
  });
});
