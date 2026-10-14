import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  type Type,
  viewChild,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ForDialog, ForDialogBackdrop } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerBackdrop, ForDrawerHandle, ForDrawerWrapper } from 'forty-cdk/drawer';

import { afterEachOverlayCleanup, flush } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Adoption guard for the single-element registries
 * ([#2248](https://github.com/tutkli/forty-cdk/issues/2248)): a piece that the owner coordinates
 * one of at a time registers through `createSingleSlot`, which stacks registrations, removes only
 * the element that leaves and reports a duplicate from the settled count. A `register*` method that
 * throws on an occupied slot reports every structural swap instead, because two sibling `@if`
 * blocks mount the incoming piece before they destroy the outgoing one.
 *
 * Half of it reads source: no `register*` method in the library throws. The other half runs that
 * swap once per registry and asserts nothing reaches the `ErrorHandler`, nothing warns, and the
 * incoming element is the registered one.
 */
function registerMethods(): Array<{ readonly id: string; readonly body: string }> {
  const out: Array<{ readonly id: string; readonly body: string }> = [];
  for (const [path, code] of LIBRARY_CODE) {
    for (const match of code.matchAll(
      /^[ \t]+(?:(?:private|protected|public|override)\s+)*(register\w*)\s*\(/gm,
    )) {
      const open = match.index + match[0].length - 1;
      const close = matchingParen(code, open);
      if (close === -1) {
        continue;
      }
      const after = code.slice(close + 1).trimStart();
      if (!after.startsWith('{') && !after.startsWith(':')) {
        continue;
      }
      const brace = code.indexOf('{', close);
      const semicolon = code.indexOf(';', close);
      if (brace === -1 || (semicolon !== -1 && semicolon < brace)) {
        continue;
      }
      const body = braceBody(code, close + 1);
      if (body !== null) {
        out.push({ id: `${path}::${match[1]}`, body });
      }
    }
  }
  return out;
}

function matchingParen(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

function braceBody(code: string, from: number): string | null {
  const start = code.indexOf('{', from);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return code.slice(start, i + 1);
  }
  return null;
}

abstract class SwapHost {
  readonly mode = signal<'a' | 'b'>('b');
}

@Component({
  imports: [ForDrawer, ForDrawerHandle],
  template: `
    <div forDrawer [handleOnly]="true" ariaLabel="Drawer">
      @if (mode() === 'a') {
        <div forDrawerHandle data-testid="a"></div>
      }
      @if (mode() === 'b') {
        <div forDrawerHandle data-testid="b"></div>
      }
    </div>
  `,
})
class DrawerHandleSwap extends SwapHost {}

@Component({
  imports: [ForDialog, ForDialogBackdrop],
  template: `
    <div forDialog ariaLabel="Dialog">
      @if (mode() === 'a') {
        <div forDialogBackdrop data-testid="a"></div>
      }
      @if (mode() === 'b') {
        <div forDialogBackdrop data-testid="b"></div>
      }
    </div>
  `,
})
class DialogBackdropSwap extends SwapHost {
  readonly surface = viewChild.required(ForDialog);
}

@Component({
  imports: [ForDrawer, ForDrawerBackdrop],
  template: `
    <div forDrawer ariaLabel="Drawer">
      @if (mode() === 'a') {
        <div forDrawerBackdrop data-testid="a"></div>
      }
      @if (mode() === 'b') {
        <div forDrawerBackdrop data-testid="b"></div>
      }
    </div>
  `,
})
class DrawerBackdropSwap extends SwapHost {
  readonly surface = viewChild.required(ForDrawer);
}

@Component({
  imports: [ForDrawer, ForDrawerWrapper],
  template: `
    @if (mode() === 'a') {
      <div forDrawerWrapper data-testid="a"></div>
    }
    @if (mode() === 'b') {
      <div forDrawerWrapper data-testid="b"></div>
    }
    <div forDrawer [scaleBackground]="true" ariaLabel="Drawer"></div>
  `,
})
class DrawerWrapperSwap extends SwapHost {}

const byTestId = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

function dispatchPointer(el: HTMLElement, type: 'pointerdown' | 'pointermove', y: number): void {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: 0,
      clientY: y,
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
    }),
  );
}

interface Registry {
  readonly name: string;
  readonly host: Type<SwapHost>;
  readonly registered: (fixture: ComponentFixture<SwapHost>) => Promise<boolean>;
}

const REGISTRIES: readonly Registry[] = [
  {
    name: 'the drawer handle',
    host: DrawerHandleSwap,
    registered: async (fixture) => {
      dispatchPointer(byTestId('a'), 'pointerdown', 0);
      dispatchPointer(byTestId('a'), 'pointermove', 20);
      await flush(fixture);
      return document.querySelector('[forDrawer]')!.hasAttribute('data-dragging');
    },
  },
  {
    name: 'the dialog backdrop',
    host: DialogBackdropSwap,
    registered: async (fixture) =>
      (fixture.componentInstance as DialogBackdropSwap).surface().backdropElement() ===
      byTestId('a'),
  },
  {
    name: 'the drawer backdrop',
    host: DrawerBackdropSwap,
    registered: async (fixture) =>
      (fixture.componentInstance as DrawerBackdropSwap).surface().backdropElement() ===
      byTestId('a'),
  },
  {
    name: 'the drawer wrapper',
    host: DrawerWrapperSwap,
    registered: async () =>
      byTestId('a').style.transform.includes('scale(') &&
      byTestId('a').getAttribute('data-state') === 'scaled',
  },
];

describe('single-slot registration adoption', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    document.body.style.backgroundColor = '';
  });

  it('finds no register* method that throws', () => {
    const methods = registerMethods();

    expect(methods.length).toBeGreaterThan(50);
    expect(methods.filter(({ body }) => /\bthrow\b/.test(body)).map(({ id }) => id)).toEqual([]);
  });

  it.each(REGISTRIES)(
    'swaps $name with sibling @if blocks without an error or a warning',
    async ({ host, registered }) => {
      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }
      TestBed.configureTestingModule({
        rethrowApplicationErrors: false,
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fixture = TestBed.createComponent<SwapHost>(host);
      await flush(fixture);

      fixture.componentInstance.mode.set('a');
      try {
        await flush(fixture);
      } catch (err) {
        captured.push(err);
      }

      expect(captured.map((err) => (err as Error).message)).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
      expect(document.querySelector('[data-testid="b"]')).toBeNull();
      expect(await registered(fixture)).toBe(true);
    },
  );
});
