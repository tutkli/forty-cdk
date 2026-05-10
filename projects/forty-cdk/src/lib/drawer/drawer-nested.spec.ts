import { Component, signal } from '@angular/core';

import { flush, pressKey, renderHost, withReducedMotion } from '../../test-utils';
import { ForDrawer } from './drawer';
import type { ForDrawerCloseReason } from './drawer-context';

@Component({
  imports: [ForDrawer],
  template: `
    @if (parentOpen()) {
      <div
        forDrawer
        id="parent-drawer"
        ariaLabel="Parent"
        (close)="onParentClose($event)"
      >
        <button id="parent-first" type="button">Parent first</button>
        <button id="open-child" type="button" (click)="childOpen.set(true)">Open child</button>

        @if (childOpen()) {
          <div
            forDrawer
            id="child-drawer"
            ariaLabel="Child"
            (close)="onChildClose($event)"
          >
            <button id="child-first" type="button">Child first</button>
            <button id="child-second" type="button">Child second</button>
          </div>
        }
      </div>
    }
  `,
})
class NestedHost {
  readonly parentOpen = signal(false);
  readonly childOpen = signal(false);
  readonly parentReasons: ForDrawerCloseReason[] = [];
  readonly childReasons: ForDrawerCloseReason[] = [];

  onParentClose(reason: ForDrawerCloseReason): void {
    this.parentReasons.push(reason);
    this.parentOpen.set(false);
    // Cascade — child's @if is nested inside parent's, but consumers
    // typically clear the child signal too so re-opening starts clean.
    this.childOpen.set(false);
  }

  onChildClose(reason: ForDrawerCloseReason): void {
    this.childReasons.push(reason);
    this.childOpen.set(false);
  }
}

describe('ForDrawer nested', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.backgroundColor = '';
  });

  describe('topology reflection', () => {
    it('parent has data-depth="0" with no child; child registers as data-depth="1"', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      await flush(r.fixture);

      const parent = document.querySelector<HTMLElement>('#parent-drawer')!;
      expect(parent.getAttribute('data-depth')).toBe('0');
      expect(parent.hasAttribute('data-state-nested')).toBe(false);

      r.instance.childOpen.set(true);
      await flush(r.fixture);

      const child = document.querySelector<HTMLElement>('#child-drawer')!;
      expect(child.getAttribute('data-depth')).toBe('1');
      expect(parent.getAttribute('data-state-nested')).toBe('true');
    });

    it('parent reverts data-state-nested when the child closes', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      r.instance.childOpen.set(true);
      await flush(r.fixture);

      const parent = document.querySelector<HTMLElement>('#parent-drawer')!;
      expect(parent.getAttribute('data-state-nested')).toBe('true');

      r.instance.childOpen.set(false);
      await flush(r.fixture);

      expect(parent.hasAttribute('data-state-nested')).toBe(false);
    });

    it('parent receives an inline transform while a child is open', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      await flush(r.fixture);

      const parent = document.querySelector<HTMLElement>('#parent-drawer')!;
      expect(parent.style.transform).toBe('');

      r.instance.childOpen.set(true);
      await flush(r.fixture);

      expect(parent.style.transform).toContain('scale(0.93)');

      r.instance.childOpen.set(false);
      await flush(r.fixture);

      expect(parent.style.transform).toBe('');
    });
  });

  describe('Escape stack', () => {
    it('first Escape closes the child; second Escape closes the parent', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      await flush(r.fixture);
      r.instance.childOpen.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.childReasons).toEqual(['escape']);
      expect(r.instance.parentReasons).toEqual([]);
      expect(document.querySelector('#child-drawer')).toBeNull();
      expect(document.querySelector<HTMLElement>('#parent-drawer')).not.toBeNull();

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.parentReasons).toEqual(['escape']);
    });
  });

  describe('focus stack', () => {
    it('opening the child moves focus into the child surface', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      await flush(r.fixture);
      expect(document.activeElement?.id).toBe('parent-first');

      r.instance.childOpen.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('child-first');
    });

    it('closing the child returns focus inside the parent (return-focus stack honours nesting)', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      await flush(r.fixture);

      const openChild = document.querySelector<HTMLButtonElement>('#open-child')!;
      openChild.focus();
      r.instance.childOpen.set(true);
      await flush(r.fixture);
      expect(document.activeElement?.id).toBe('child-first');

      r.instance.childOpen.set(false);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('open-child');
    });
  });

  describe('cascade unmount', () => {
    it('closing the parent while the child is still mounted unmounts both without throwing', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      r.instance.childOpen.set(true);
      await flush(r.fixture);

      expect(() => {
        r.instance.parentOpen.set(false);
      }).not.toThrow();
      await flush(r.fixture);

      expect(document.querySelector('#parent-drawer')).toBeNull();
      expect(document.querySelector('#child-drawer')).toBeNull();
    });

    it('does not leave residual body overflow lock after the cascade', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      r.instance.childOpen.set(true);
      await flush(r.fixture);
      expect(document.body.style.overflow).toBe('hidden');

      r.instance.parentOpen.set(false);
      await flush(r.fixture);

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('prefers-reduced-motion: reduce', () => {
    let restore: () => void;
    beforeEach(() => {
      restore = withReducedMotion();
    });
    afterEach(() => {
      restore();
    });

    it('suppresses the parent nested-state transform but keeps data-state-nested', async () => {
      const r = renderHost(NestedHost);
      r.instance.parentOpen.set(true);
      r.instance.childOpen.set(true);
      await flush(r.fixture);

      const parent = document.querySelector<HTMLElement>('#parent-drawer')!;
      expect(parent.getAttribute('data-state-nested')).toBe('true');
      expect(parent.style.transform).toBe('');
    });
  });
});
