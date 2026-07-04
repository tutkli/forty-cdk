import { Component, signal } from '@angular/core';

import { renderHost } from '../../../src/test-utils';
import type { HostRovingItemHandle } from './host-roving-context';
import { reconcileRovingActive } from './reconcile-roving-active';
import { RovingTabindex } from './roving-tabindex';

interface FakeHandle extends HostRovingItemHandle {
  readonly disabledSig: ReturnType<typeof signal<boolean>>;
}

function makeHandle(host: HTMLElement, disabled = false): FakeHandle {
  const disabledSig = signal(disabled);
  return { host, disabled: disabledSig, disabledSig };
}

@Component({ template: '' })
class ReconcileHost {
  readonly roving = new RovingTabindex();
  readonly items = signal<readonly FakeHandle[]>([]);

  constructor() {
    reconcileRovingActive(this.roving, this.items);
  }
}

@Component({ template: '' })
class FirstEnabledHost {
  readonly roving = new RovingTabindex();
  readonly items = signal<readonly FakeHandle[]>([]);

  constructor() {
    reconcileRovingActive(this.roving, this.items, { fallback: 'first-enabled' });
  }
}

describe('reconcileRovingActive', () => {
  it('nulls the active pointer when its host unregisters', async () => {
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      const { instance, flush } = renderHost(ReconcileHost);
      instance.items.set([makeHandle(a), makeHandle(b)]);
      instance.roving.setActive(a);
      await flush();

      instance.items.set([makeHandle(b)]);
      await flush();

      expect(instance.roving.active()).toBe(null);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('nulls the active pointer when its host becomes disabled', async () => {
    const a = document.createElement('button');
    document.body.append(a);
    try {
      const { instance, flush } = renderHost(ReconcileHost);
      const handle = makeHandle(a);
      instance.items.set([handle]);
      instance.roving.setActive(a);
      await flush();

      handle.disabledSig.set(true);
      await flush();

      expect(instance.roving.active()).toBe(null);
    } finally {
      a.remove();
    }
  });

  it('leaves an enabled, registered active host untouched', async () => {
    const a = document.createElement('button');
    document.body.append(a);
    try {
      const { instance, flush } = renderHost(ReconcileHost);
      instance.items.set([makeHandle(a)]);
      instance.roving.setActive(a);
      await flush();

      expect(instance.roving.active()).toBe(a);
    } finally {
      a.remove();
    }
  });

  describe("fallback: 'first-enabled'", () => {
    it('promotes the first enabled handle when the active host unregisters', async () => {
      const a = document.createElement('button');
      const b = document.createElement('button');
      document.body.append(a, b);
      try {
        const { instance, flush } = renderHost(FirstEnabledHost);
        instance.items.set([makeHandle(a), makeHandle(b)]);
        instance.roving.setActive(a);
        await flush();

        instance.items.set([makeHandle(b)]);
        await flush();

        expect(instance.roving.active()).toBe(b);
      } finally {
        a.remove();
        b.remove();
      }
    });

    it('skips a disabled leading handle to the first enabled one', async () => {
      const a = document.createElement('button');
      const b = document.createElement('button');
      const c = document.createElement('button');
      document.body.append(a, b, c);
      try {
        const { instance, flush } = renderHost(FirstEnabledHost);
        instance.items.set([makeHandle(a), makeHandle(b, true), makeHandle(c)]);
        instance.roving.setActive(a);
        await flush();

        instance.items.set([makeHandle(b, true), makeHandle(c)]);
        await flush();

        expect(instance.roving.active()).toBe(c);
      } finally {
        a.remove();
        b.remove();
        c.remove();
      }
    });

    it('nulls the pointer when no enabled handle remains', async () => {
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const { instance, flush } = renderHost(FirstEnabledHost);
        const handle = makeHandle(a);
        instance.items.set([handle]);
        instance.roving.setActive(a);
        await flush();

        handle.disabledSig.set(true);
        await flush();

        expect(instance.roving.active()).toBe(null);
      } finally {
        a.remove();
      }
    });
  });
});
