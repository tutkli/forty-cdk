import { Component, inject, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForDialog, type ForDialogCloseReason } from 'forty-cdk/dialog';
import { ForDrawer, type ForDrawerCloseReason } from 'forty-cdk/drawer';
import { ForToastManager, ForToastViewport, provideForToastDefaults } from 'forty-cdk/toast';

import { flush } from '../test-utils/flush';
import { pointerDownOn } from '../test-utils/outside-events';
import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { renderHost } from '../test-utils/render';

@Component({
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

    const toast = r.el.querySelector('[forToast]')!;
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

    const toast = r.el.querySelector('[forToast]')!;
    expect(toast).not.toBeNull();

    pointerDownOn(toast);

    expect(r.instance.dismissReasons).toEqual([]);
    expect(r.instance.open()).toBe(true);
  });

  it('holds under provideZonelessChangeDetection()', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(DialogToastHost);
    fixture.detectChanges();
    await flush(fixture);

    fixture.componentInstance.manager.show({ title: 'Saved' });
    await flush(fixture);

    const toast = (fixture.nativeElement as HTMLElement).querySelector('[forToast]')!;
    pointerDownOn(toast);

    expect(fixture.componentInstance.dismissReasons).toEqual([]);
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('with overModal: "inert", clicking a toast dismisses the open modal dialog', async () => {
    const r = renderHost(InertDialogToastHost);
    await r.flush();
    r.instance.manager.show({ title: 'Saved' });
    await r.flush();

    const toast = r.el.querySelector('[forToast]')!;
    expect(toast).not.toBeNull();

    pointerDownOn(toast);

    expect(r.instance.dismissReasons).toEqual(['pointerDownOutside']);
    expect(r.instance.open()).toBe(false);
  });

  it('the inert opt-out holds under provideZonelessChangeDetection()', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(InertDialogToastHost);
    fixture.detectChanges();
    await flush(fixture);

    fixture.componentInstance.manager.show({ title: 'Saved' });
    await flush(fixture);

    const toast = (fixture.nativeElement as HTMLElement).querySelector('[forToast]')!;
    pointerDownOn(toast);

    expect(fixture.componentInstance.dismissReasons).toEqual(['pointerDownOutside']);
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
