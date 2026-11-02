import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForDialogManager, ForDialogTitle } from 'forty-cdk/dialog';
import { ForDrawerManager, ForDrawerTitle } from 'forty-cdk/drawer';
import { pressKey } from 'forty-cdk/testing';
import { ForToastManager, ForToastViewport } from 'forty-cdk/toast';

import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { LIBRARY_CODE } from '../test-utils/source-scan';

function filesWhere(predicate: (code: string) => boolean): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => predicate(code))
    .map(([path]) => path)
    .sort();
}

const managers = filesWhere((code) => /extends OverlayManagerCore</.test(code));
const registrars = filesWhere(
  (code) => /\bregisterSurface\(this\./.test(code) && !code.includes('class OverlayManagerCore'),
);

describe('managed overlay close adoption', () => {
  it('derives every manager and every surface registrar', () => {
    expect(managers).toEqual(['dialog/src/dialog-manager.ts', 'drawer/src/drawer-manager.ts']);
    expect(registrars).toEqual(['dialog/src/dialog-outlet.ts', 'drawer/src/drawer-outlet.ts']);
  });

  it.each(registrars)('%s registers a surface that releases its modal shell', (path) => {
    const code = LIBRARY_CODE.get(path)!;

    expect(code).toMatch(/registerSurface\(this\.id\(\), \{[^}]*\brelease: \(target\) =>/);
    expect(code).toContain('.releaseModalShell(target)');
  });

  it('releases the shell from beginLeave before the exit animation starts', () => {
    const code = LIBRARY_CODE.get('core-overlay/src/overlay-manager/overlay-manager.ts')!;
    const beginLeave = code.slice(code.indexOf('protected beginLeave('));

    expect(code).toContain('this.#surfaces.get(id)?.release(entry?.returnFocusTarget ?? null)');
    expect(beginLeave.indexOf('this.#releaseSurface(id)')).toBeGreaterThan(-1);
    expect(beginLeave.indexOf('this.#releaseSurface(id)')).toBeLessThan(
      beginLeave.indexOf('classList.add('),
    );
  });

  it('returns focus from the modal shell through ReturnFocusResolver only', () => {
    const code = LIBRARY_CODE.get('core-overlay/src/modal-shell/modal-shell.ts')!;

    expect(code).toContain('returnFocus.resolve(overrideTarget, returnFocusTarget)');
    expect(code).not.toContain('.isConnected');
    expect(code).not.toMatch(/deactivate\(\{ returnFocus: (?!false)/);
  });
});

@Component({
  imports: [ForDialogTitle],
  template: `
    <h2 forDialogTitle>Dialog</h2>
    <button type="button" data-testid="inside">inside</button>
  `,
})
class DialogBody {}

@Component({
  imports: [ForDrawerTitle],
  template: `
    <h2 forDrawerTitle>Drawer</h2>
    <button type="button" data-testid="inside">inside</button>
  `,
})
class DrawerBody {}

interface ManagedRef {
  close(): void;
  isClosed(): boolean;
}

interface ManagerCase {
  readonly name: string;
  readonly open: (config: { animateLeave?: string; escapeKeyDown?: () => void }) => ManagedRef;
  readonly closeAll: () => void;
}

function dialogCase(): ManagerCase {
  const manager = TestBed.inject(ForDialogManager);
  return {
    name: 'ForDialogManager',
    open: (config) => manager.open(DialogBody, config),
    closeAll: () => manager.closeAll(),
  };
}

function drawerCase(): ManagerCase {
  const manager = TestBed.inject(ForDrawerManager);
  return {
    name: 'ForDrawerManager',
    open: (config) => manager.open(DrawerBody, config),
    closeAll: () => manager.closeAll(),
  };
}

function hosts(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"]')];
}

function holdExitAnimation(host: HTMLElement): () => void {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => (finish = resolve));
  host.getAnimations = () => [{ finished }] as unknown as Animation[];
  return finish;
}

function inertOutsideOverlays(): Element[] {
  return [...document.querySelectorAll('[inert]')].filter(
    (el) => el.closest('[role="dialog"]') === null,
  );
}

describe.each([
  ['ForDialogManager', dialogCase],
  ['ForDrawerManager', drawerCase],
])('%s close intent', (_name, build) => {
  afterEachOverlayCleanup();

  let trigger: HTMLButtonElement;
  let pending: (() => void)[];
  let managed: ManagerCase;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    trigger = document.createElement('button');
    trigger.textContent = 'open';
    document.body.appendChild(trigger);
    trigger.focus();
    pending = [];
    managed = build();
  });

  afterEach(async () => {
    managed.closeAll();
    pending.forEach((finish) => finish());
    await vi.waitFor(() => expect(hosts()).toHaveLength(0));
    trigger.remove();
  });

  it('releases scroll lock, inert siblings and focus before the host leaves the DOM', () => {
    const ref = managed.open({ animateLeave: 'leaving' });
    const [host] = hosts();
    pending.push(holdExitAnimation(host!));
    expect(document.body.style.overflow).toBe('hidden');
    expect(inertOutsideOverlays().length).toBeGreaterThan(0);

    ref.close();

    expect(host!.isConnected).toBe(true);
    expect(host!.classList.contains('leaving')).toBe(true);
    expect(document.body.style.overflow).toBe('');
    expect(inertOutsideOverlays()).toEqual([]);
    expect(document.activeElement).toBe(trigger);
  });

  it('hands the next Escape to the overlay below a closing one', () => {
    const below = managed.open({});
    const escapes = vi.fn();
    const above = managed.open({ animateLeave: 'leaving', escapeKeyDown: escapes });
    pending.push(holdExitAnimation(hosts().at(-1)!));

    pressKey(document.activeElement!, 'Escape');
    expect(above.isClosed()).toBe(true);
    expect(escapes).toHaveBeenCalledTimes(1);

    pressKey(document.activeElement!, 'Escape');

    expect(below.isClosed()).toBe(true);
    expect(escapes).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the bottom trigger when closeAll() meets a held exit on top', () => {
    managed.open({});
    const inner = hosts()[0]!.querySelector<HTMLElement>('[data-testid="inside"]')!;
    inner.focus();
    managed.open({ animateLeave: 'leaving' });
    pending.push(holdExitAnimation(hosts().at(-1)!));

    managed.closeAll();
    TestBed.tick();

    expect(document.activeElement).toBe(trigger);
  });
});

@Component({
  host: { 'data-fixture': 'managed-close-toast-host' },
  imports: [ForToastViewport],
  template: `<for-toast-viewport />`,
})
class ToastHost {
  readonly toasts = inject(ForToastManager);
}

describe.each([
  ['ForDialogManager', dialogCase],
  ['ForDrawerManager', drawerCase],
])('%s opened from a toast action', (_name, build) => {
  afterEachOverlayCleanup();

  it('returns focus to a connected element after the toast removed the action', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ToastHost);
    const managed = build();
    fixture.componentInstance.toasts.show({
      title: 'Saved',
      duration: Infinity,
      action: { label: 'View details', activate: () => managed.open({}) },
    });
    TestBed.tick();
    const action = document.querySelector<HTMLButtonElement>('[forToastAction]')!;
    action.focus();

    action.click();
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
    expect(action.isConnected).toBe(false);
    expect(hosts()).toHaveLength(1);

    pressKey(document.activeElement!, 'Escape');
    TestBed.tick();

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.isConnected).toBe(true);
    fixture.destroy();
  });
});
