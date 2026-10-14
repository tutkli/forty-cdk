import { Component, signal, type Type } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { ForDialog, ForDialogTrigger } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerTrigger } from 'forty-cdk/drawer';
import { pointerEvent } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, renderHost } from '../test-utils';
import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Adoption guard for the controlling-trigger exemption on the modal shell's surfaces
 * ([#2249](https://github.com/tutkli/forty-cdk/issues/2249)). A trigger toggles its surface on
 * `click`, but the surface's dismissible layer decides an outside press on `pointerdown`: unless
 * the trigger counts as inside the surface, the press closes it, change detection pushes `false`
 * into the trigger's model before the `click` arrives, and the click opens it again.
 *
 * The roster is derived from source: every `[for…Trigger]` directive in an entry point that
 * declares a `ModalSurfaceBase` subclass must register through `injectModalTrigger`, and must have
 * a runtime case below. Each case presses the trigger of an open surface with change detection
 * running between the `pointerdown` and the `click`, as it does for a human press, and asserts the
 * surface stays closed and no `(pointerDownOutside)` / `(focusOutside)` fired.
 */
function modalEntryPoints(): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [path, code] of LIBRARY_CODE) {
    if (/\bextends\s+ModalSurfaceBase\s*</.test(code)) {
      out.add(entryPointOf(path));
    }
  }
  return out;
}

function modalTriggers(): ReadonlyMap<string, string> {
  const entryPoints = modalEntryPoints();
  const out = new Map<string, string>();
  for (const [path, code] of LIBRARY_CODE) {
    if (!entryPoints.has(entryPointOf(path))) {
      continue;
    }
    const selector = /selector:\s*'\[(for\w+Trigger)\]'/.exec(code);
    if (selector) {
      out.set(selector[1]!, path);
    }
  }
  return out;
}

interface TriggerHost {
  readonly open: ReturnType<typeof signal<boolean>>;
  readonly outside: string[];
}

@Component({
  imports: [ForDialog, ForDialogTrigger],
  template: `
    <button forDialogTrigger [(open)]="open" controls="surface">Toggle</button>
    @if (open()) {
      <div
        forDialog
        id="surface"
        [modal]="false"
        ariaLabel="Surface"
        (pointerDownOutside)="outside.push('pointer')"
        (focusOutside)="outside.push('focus')"
        (dismiss)="open.set(false)"
      >
        <button>Inside</button>
      </div>
    }
  `,
})
class NonModalDialog implements TriggerHost {
  readonly open = signal(false);
  readonly outside: string[] = [];
}

@Component({
  imports: [ForDialog, ForDialogTrigger],
  template: `
    <button forDialogTrigger [(open)]="open" controls="surface">Toggle</button>
    <div #region></div>
    @if (open()) {
      <div
        forDialog
        id="surface"
        [modal]="true"
        [container]="region"
        ariaLabel="Surface"
        (pointerDownOutside)="outside.push('pointer')"
        (focusOutside)="outside.push('focus')"
        (dismiss)="open.set(false)"
      >
        <button>Inside</button>
      </div>
    }
  `,
})
class ContainedModalDialog implements TriggerHost {
  readonly open = signal(false);
  readonly outside: string[] = [];
}

@Component({
  imports: [ForDrawer, ForDrawerTrigger],
  template: `
    <button forDrawerTrigger [(open)]="open" controls="surface">Toggle</button>
    @if (open()) {
      <div
        forDrawer
        id="surface"
        [modal]="false"
        ariaLabel="Surface"
        (pointerDownOutside)="outside.push('pointer')"
        (focusOutside)="outside.push('focus')"
        (dismiss)="open.set(false)"
      >
        <button>Inside</button>
      </div>
    }
  `,
})
class NonModalDrawer implements TriggerHost {
  readonly open = signal(false);
  readonly outside: string[] = [];
}

@Component({
  imports: [ForDrawer, ForDrawerTrigger],
  template: `
    <button forDrawerTrigger [(open)]="open" controls="surface">Toggle</button>
    <div #region></div>
    @if (open()) {
      <div
        forDrawer
        id="surface"
        [modal]="true"
        [container]="region"
        ariaLabel="Surface"
        (pointerDownOutside)="outside.push('pointer')"
        (focusOutside)="outside.push('focus')"
        (dismiss)="open.set(false)"
      >
        <button>Inside</button>
      </div>
    }
  `,
})
class ContainedModalDrawer implements TriggerHost {
  readonly open = signal(false);
  readonly outside: string[] = [];
}

@Component({
  imports: [ForDrawer, ForDrawerTrigger],
  template: `
    <button forDrawerTrigger [(open)]="open">Toggle</button>
    @if (open()) {
      <div
        forDrawer
        [modal]="false"
        ariaLabel="Surface"
        (pointerDownOutside)="outside.push('pointer')"
        (focusOutside)="outside.push('focus')"
        (dismiss)="open.set(false)"
      >
        <button>Inside</button>
      </div>
    }
  `,
})
class UncontrolledNonModalDrawer implements TriggerHost {
  readonly open = signal(false);
  readonly outside: string[] = [];
}

const CASES: Readonly<
  Record<string, ReadonlyArray<readonly [string, Type<TriggerHost>, warns?: boolean]>>
> = {
  forDialogTrigger: [
    ['a non-modal surface', NonModalDialog],
    [
      'a container-scoped modal surface with the trigger outside the container',
      ContainedModalDialog,
    ],
  ],
  forDrawerTrigger: [
    ['a non-modal surface', NonModalDrawer],
    [
      'a container-scoped modal surface with the trigger outside the container',
      ContainedModalDrawer,
    ],
    ['a non-modal surface whose trigger sets no [controls]', UncontrolledNonModalDrawer, true],
  ],
};

const surface = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[fordialog], [fordrawer]');

describe('controlling-trigger exemption on modal-shell surfaces (#2249)', () => {
  afterEachOverlayCleanup();

  it('derives the trigger roster from source', () => {
    expect([...modalTriggers().keys()].sort()).toEqual(Object.keys(CASES).sort());
  });

  it.each([...modalTriggers()])('%s registers through injectModalTrigger (%s)', (_, path) => {
    expect(LIBRARY_CODE.get(path)).toMatch(/\binjectModalTrigger\(/);
  });

  for (const [trigger, cases] of Object.entries(CASES)) {
    for (const [label, host, warns] of cases) {
      it(`[${trigger}] closes ${label} when its trigger is pressed`, async () => {
        const warn = warns ? vi.spyOn(console, 'warn').mockImplementation(() => undefined) : null;
        const { instance, query, flush } = renderHost(host);
        const button = query<HTMLButtonElement>('button')!;

        button.click();
        await flush();
        expect(surface()).not.toBeNull();
        expect(document.activeElement).not.toBe(button);

        button.dispatchEvent(
          pointerEvent('pointerdown', { button: 0, buttons: 1, pointerType: 'mouse' }),
        );
        button.focus();
        await flush();
        button.click();
        await flush();

        expect(instance.open()).toBe(false);
        expect(surface()).toBeNull();
        expect(instance.outside).toEqual([]);
        if (warn) {
          expect(warn).toHaveBeenCalledWith(expect.stringContaining('FORCDK-DRAWER-013'));
        }
      });
    }
  }
});
