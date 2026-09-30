import { Component, inject, signal } from '@angular/core';

import { ForDialog, type ForDialogCloseReason } from 'forty-cdk/dialog';
import { ForDrawer, type ForDrawerCloseReason } from 'forty-cdk/drawer';
import { ForToastManager, ForToastViewport, provideForToastDefaults } from 'forty-cdk/toast';

import { pointerDownOn } from '../test-utils/outside-events';
import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { renderHost } from '../test-utils/render';

@Component({
  host: { 'data-fixture': 'dialog-toast-host' },
  imports: [ForDialog, ForToastViewport],
  template: `
    <button #before type="button" data-test-id="before">before</button>
    @if (open()) {
      <div forDialog ariaLabel="Test dialog" (dismiss)="onDismiss($event)">
        <button type="button" data-test-id="inside">inside</button>
      </div>
    }
    <for-toast-viewport />
  `,
})
class DialogToastHost {
  readonly manager = inject(ForToastManager);
  readonly open = signal(true);
  readonly dismissReasons: ForDialogCloseReason[] = [];

  onDismiss(reason: ForDialogCloseReason): void {
    this.dismissReasons.push(reason);
    this.open.set(false);
  }
}

@Component({
  imports: [ForDrawer, ForToastViewport],
  template: `
    <button type="button" data-test-id="before">before</button>
    @if (open()) {
      <div forDrawer ariaLabel="Test drawer" (dismiss)="onDismiss($event)">
        <button type="button" data-test-id="inside">inside</button>
      </div>
    }
    <for-toast-viewport />
  `,
})
class DrawerToastHost {
  readonly manager = inject(ForToastManager);
  readonly open = signal(true);
  readonly dismissReasons: ForDrawerCloseReason[] = [];

  onDismiss(reason: ForDrawerCloseReason): void {
    this.dismissReasons.push(reason);
    this.open.set(false);
  }
}

@Component({
  host: { 'data-fixture': 'inert-dialog-toast-host' },
  imports: [ForDialog, ForToastViewport],
  providers: [provideForToastDefaults({ overModal: 'inert' })],
  template: `
    <button #before type="button" data-test-id="before">before</button>
    @if (open()) {
      <div forDialog ariaLabel="Test dialog" (dismiss)="onDismiss($event)">
        <button type="button" data-test-id="inside">inside</button>
      </div>
    }
    <for-toast-viewport />
  `,
})
class InertDialogToastHost {
  readonly manager = inject(ForToastManager);
  readonly open = signal(true);
  readonly dismissReasons: ForDialogCloseReason[] = [];

  onDismiss(reason: ForDialogCloseReason): void {
    this.dismissReasons.push(reason);
    this.open.set(false);
  }
}

describe('toast over a modal overlay', () => {
  afterEachOverlayCleanup();

  it('clicking a toast does not dismiss an open modal dialog', async () => {
    const r = renderHost(DialogToastHost);
    await r.flush();
    r.instance.manager.show({ title: 'Saved' });
    await r.flush();

    const toast = document.querySelector('[forToast]')!;
    expect(toast).not.toBeNull();

    pointerDownOn(toast);

    expect(r.instance.dismissReasons).toEqual([]);
    expect(r.instance.open()).toBe(true);
  });

  it('a pointer-down genuinely outside still dismisses the dialog', async () => {
    const r = renderHost(DialogToastHost);
    await r.flush();
    r.instance.manager.show({ title: 'Saved' });
    await r.flush();

    pointerDownOn(r.el.querySelector('[data-test-id="before"]')!);

    expect(r.instance.dismissReasons).toEqual(['pointerDownOutside']);
    expect(r.instance.open()).toBe(false);
  });

  it('clicking a toast does not dismiss an open modal drawer', async () => {
    const r = renderHost(DrawerToastHost);
    await r.flush();
    r.instance.manager.show({ title: 'Saved' });
    await r.flush();

    const toast = document.querySelector('[forToast]')!;
    expect(toast).not.toBeNull();

    pointerDownOn(toast);

    expect(r.instance.dismissReasons).toEqual([]);
    expect(r.instance.open()).toBe(true);
  });

  it('with overModal: "inert", clicking a toast dismisses the open modal dialog', async () => {
    const r = renderHost(InertDialogToastHost);
    await r.flush();
    r.instance.manager.show({ title: 'Saved' });
    await r.flush();

    const toast = document.querySelector('[forToast]')!;
    expect(toast).not.toBeNull();

    pointerDownOn(toast);

    expect(r.instance.dismissReasons).toEqual(['pointerDownOutside']);
    expect(r.instance.open()).toBe(false);
  });

  it('a viewport declared in the app shell has no inert or hidden ancestor under a modal dialog', async () => {
    const r = renderHost(DialogToastHost);
    await r.flush();

    const viewport = document.querySelector<HTMLElement>('for-toast-viewport')!;
    expect(r.el.closest('[inert]')).not.toBeNull();
    expect(viewport.parentElement).toBe(document.body);
    expect(viewport.closest('[inert], [aria-hidden="true"]')).toBeNull();
  });

  it('a viewport declared in the app shell has no inert or hidden ancestor under a modal drawer', async () => {
    const r = renderHost(DrawerToastHost);
    await r.flush();

    const viewport = document.querySelector<HTMLElement>('for-toast-viewport')!;
    expect(r.el.closest('[inert]')).not.toBeNull();
    expect(viewport.closest('[inert], [aria-hidden="true"]')).toBeNull();
  });

  it('a bare error toast over a modal dialog is an alert region with no hidden ancestor', async () => {
    const r = renderHost(DialogToastHost);
    await r.flush();
    r.instance.manager.show({ title: 'Upload failed', variant: 'error' });
    await r.flush();

    const toast = document.querySelector<HTMLElement>('[forToast]')!;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('assertive');
    expect(toast.closest('[inert], [aria-hidden="true"]')).toBeNull();
  });

  it('with overModal: "inert", the modal inerts the viewport it now finds at body level', async () => {
    const r = renderHost(InertDialogToastHost);
    await r.flush();

    const viewport = document.querySelector<HTMLElement>('for-toast-viewport')!;
    expect(viewport.parentElement).toBe(document.body);
    expect(viewport.hasAttribute('inert')).toBe(true);
    expect(viewport.getAttribute('aria-hidden')).toBe('true');
  });
});
