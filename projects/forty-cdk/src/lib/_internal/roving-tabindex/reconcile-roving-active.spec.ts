import { Component, signal } from '@angular/core';

import { renderHost } from '../../../test-utils';
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
});
