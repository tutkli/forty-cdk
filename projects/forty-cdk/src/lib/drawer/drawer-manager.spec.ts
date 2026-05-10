import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { pressKey } from '../../test-utils';
import {
  ForDrawerManager,
  FOR_DRAWER_DATA,
  injectDrawerData,
} from './drawer-manager';
import { ForDrawerRef } from './drawer-ref';
import { provideForDrawerDefaults } from './drawer-defaults';

interface SheetData {
  message: string;
}

@Component({
  template: `
    <p id="message">{{ data.message }}</p>
    <button id="ok" (click)="ok()">OK</button>
    <button id="cancel" (click)="cancel()">Cancel</button>
  `,
})
class SheetDrawer {
  readonly data = injectDrawerData<SheetData>();
  readonly ref = inject(ForDrawerRef) as ForDrawerRef<'confirm' | 'cancel'>;

  ok(): void {
    this.ref.close('confirm');
  }
  cancel(): void {
    this.ref.close('cancel');
  }
}

@Component({ template: `<p>token check: {{ tokenValue }}</p>` })
class TokenCheck {
  readonly tokenValue = inject(FOR_DRAWER_DATA, { optional: true }) as string | null;
}

function setup(extraProviders: Parameters<typeof TestBed.configureTestingModule>[0] = {}): {
  drawers: ForDrawerManager;
  trigger: HTMLButtonElement;
} {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...(extraProviders.providers ?? [])],
  });
  const drawers = TestBed.inject(ForDrawerManager);
  const trigger = document.createElement('button');
  trigger.id = 'external-trigger';
  trigger.textContent = 'open';
  document.body.appendChild(trigger);
  trigger.focus();
  return { drawers, trigger };
}

describe('ForDrawerManager (programmatic)', () => {
  afterEach(() => {
    document
      .querySelectorAll('[role="dialog"], [role="alertdialog"], #external-trigger')
      .forEach((n) => n.remove());
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    TestBed.resetTestingModule();
  });

  describe('open()', () => {
    it('returns a ForDrawerRef synchronously', () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'hi' } });
      expect(ref).toBeInstanceOf(ForDrawerRef);
    });

    it('mounts the component to body with role=dialog and aria-modal', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'hi' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host).toBeTruthy();
      expect(host.parentElement).toBe(document.body);
      expect(host.getAttribute('aria-modal')).toBe('true');
      expect(host.getAttribute('data-side')).toBe('bottom');
    });

    it('reflects data-side from the side option', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'hi' }, side: 'right' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('right');
    });

    it('applies the alert role when alert: true', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'hi' }, alert: true });
      expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    });

    it('passes data via FOR_DRAWER_DATA', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'Hello world' } });
      expect(document.querySelector('#message')!.textContent).toBe('Hello world');
    });

    it('passes null for FOR_DRAWER_DATA when no data is configured', () => {
      const { drawers } = setup();
      drawers.open(TokenCheck);
      expect(document.querySelector('p')!.textContent).toBe('token check: ');
    });

    it('counts open drawers reactively', () => {
      const { drawers } = setup();
      expect(drawers.openCount()).toBe(0);
      const a = drawers.open(SheetDrawer, { data: { message: 'a' } });
      const b = drawers.open(SheetDrawer, { data: { message: 'b' } });
      expect(drawers.openCount()).toBe(2);
      a.close();
      b.close();
      expect(drawers.openCount()).toBe(0);
    });
  });

  describe('ForDrawerRef.close', () => {
    it('resolves closed with the result', async () => {
      const { drawers } = setup();
      const ref = drawers.open<SheetDrawer, 'confirm' | 'cancel', SheetData>(SheetDrawer, {
        data: { message: 'x' },
      });

      document.querySelector<HTMLButtonElement>('#ok')!.click();
      expect(await ref.closed).toBe('confirm');
    });

    it('reflects result and isClosed reactively', async () => {
      const { drawers } = setup();
      const ref = drawers.open<SheetDrawer, 'confirm' | 'cancel', SheetData>(SheetDrawer, {
        data: { message: 'x' },
      });
      expect(ref.isClosed()).toBe(false);

      document.querySelector<HTMLButtonElement>('#cancel')!.click();
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
      expect(ref.result()).toBe('cancel');
    });

    it('removes the host element on close', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(document.querySelector('[role="dialog"]')).toBeTruthy();
      ref.close();
      await ref.closed;
      expect(document.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('is idempotent', async () => {
      const { drawers } = setup();
      const ref = drawers.open<SheetDrawer, string>(SheetDrawer, {
        data: { message: 'x' },
      });
      ref.close('first');
      ref.close('second');
      expect(await ref.closed).toBe('first');
    });
  });

  describe('focus management', () => {
    it('focuses the first focusable on open', () => {
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(document.activeElement?.id).toBe('ok');
    });

    it('returns focus to the previously focused element on close', async () => {
      const { drawers, trigger } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      ref.close();
      await ref.closed;
      expect(document.activeElement).toBe(trigger);
    });

    it('honors returnFocus: false', async () => {
      const { drawers, trigger } = setup();
      const ref = drawers.open(SheetDrawer, {
        data: { message: 'x' },
        returnFocus: false,
      });
      ref.close();
      await ref.closed;
      expect(document.activeElement).not.toBe(trigger);
    });

    it('skips initial focus when autoFocusOnOpen calls preventDefault', () => {
      const { drawers, trigger } = setup();
      trigger.focus();
      drawers.open(SheetDrawer, {
        data: { message: 'x' },
        autoFocusOnOpen: (e) => e.preventDefault(),
      });
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('Escape key', () => {
    it('closes a dismissible drawer', async () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      pressKey(document, 'Escape');
      await ref.closed;
      expect(ref.isClosed()).toBe(true);
    });

    it('is ignored when dismissible: false', () => {
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' }, dismissible: false });
      pressKey(document, 'Escape');
      expect(ref.isClosed()).toBe(false);
      ref.close();
    });
  });

  describe('body scroll lock', () => {
    it('locks while modal drawer is open and clears on close', async () => {
      document.body.style.overflow = 'auto';
      const { drawers } = setup();
      const ref = drawers.open(SheetDrawer, { data: { message: 'x' } });
      expect(document.body.style.overflow).toBe('hidden');
      ref.close();
      await ref.closed;
      expect(document.body.style.overflow).toBe('');
    });

    it('does NOT lock for non-modal drawers', () => {
      document.body.style.overflow = 'auto';
      const { drawers } = setup();
      drawers.open(SheetDrawer, { data: { message: 'x' }, modal: false });
      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('defaults provider', () => {
    it('side from provideForDrawerDefaults applies when config omits it', () => {
      const { drawers } = setup({
        providers: [provideForDrawerDefaults({ side: 'right' })],
      });
      drawers.open(SheetDrawer, { data: { message: 'x' } });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('right');
    });

    it('config option overrides the defaults provider', () => {
      const { drawers } = setup({
        providers: [provideForDrawerDefaults({ side: 'right' })],
      });
      drawers.open(SheetDrawer, { data: { message: 'x' }, side: 'left' });
      const host = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(host.getAttribute('data-side')).toBe('left');
    });
  });

  describe('closeThreshold validation', () => {
    it('throws when closeThreshold is greater than 1', () => {
      const { drawers } = setup();
      expect(() =>
        drawers.open(SheetDrawer, { data: { message: 'x' }, closeThreshold: 2 }),
      ).toThrow('[forty-cdk/drawer] closeThreshold must be in [0, 1], got 2.');
    });

    it('throws when closeThreshold is NaN', () => {
      const { drawers } = setup();
      expect(() =>
        drawers.open(SheetDrawer, { data: { message: 'x' }, closeThreshold: Number.NaN }),
      ).toThrow('[forty-cdk/drawer] closeThreshold must be in [0, 1], got NaN.');
    });

    it('accepts a valid closeThreshold of 0.5', () => {
      const { drawers } = setup();
      expect(() =>
        drawers.open(SheetDrawer, { data: { message: 'x' }, closeThreshold: 0.5 }),
      ).not.toThrow();
    });
  });
});
