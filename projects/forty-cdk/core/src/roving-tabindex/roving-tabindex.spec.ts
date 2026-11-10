import { computed, signal } from '@angular/core';

import type { HostRovingItemHandle } from './host-roving-context';
import { RovingTabindex } from './roving-tabindex';

function makeHandle(host: HTMLElement, disabled = false): HostRovingItemHandle {
  return { host, disabled: signal(disabled) };
}

describe('RovingTabindex', () => {
  it('starts with no active element', () => {
    const r = new RovingTabindex();
    expect(r.active()).toBe(null);
  });

  it('returns -1 for any element when no active is set', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    expect(r.tabindexFor(a)).toBe(-1);
    expect(r.tabindexFor(b)).toBe(-1);
  });

  it('returns 0 for the active element and -1 for the rest', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      r.setActive(a);
      expect(r.tabindexFor(a)).toBe(0);
      expect(r.tabindexFor(b)).toBe(-1);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('reacts to setActive in computed signals', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      const aTabindex = computed(() => r.tabindexFor(a));
      const bTabindex = computed(() => r.tabindexFor(b));

      expect(aTabindex()).toBe(-1);
      r.setActive(a);
      expect(aTabindex()).toBe(0);
      expect(bTabindex()).toBe(-1);
      r.setActive(b);
      expect(aTabindex()).toBe(-1);
      expect(bTabindex()).toBe(0);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('setActive(null) clears the active', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    r.setActive(a);
    r.setActive(null);
    expect(r.active()).toBe(null);
    expect(r.tabindexFor(a)).toBe(-1);
  });

  it('focusActive moves active and focuses the new element', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      r.setActive(a);
      r.focusActive(b);
      expect(r.active()).toBe(b);
      expect(document.activeElement).toBe(b);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('focusActive with no argument focuses the current active', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    document.body.append(a);
    try {
      r.setActive(a);
      r.focusActive();
      expect(document.activeElement).toBe(a);
    } finally {
      a.remove();
    }
  });

  describe('self-healing active', () => {
    it('hasActive is false when nothing is active', () => {
      const r = new RovingTabindex();
      expect(r.hasActive()).toBe(false);
    });

    it('hasActive is true for a connected, enabled active element', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        r.setActive(a);
        expect(r.hasActive()).toBe(true);
      } finally {
        a.remove();
      }
    });

    it('treats a detached active element as stale (no tab stop)', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      // Never appended → not connected.
      r.setActive(a);
      expect(r.hasActive()).toBe(false);
      expect(r.tabindexFor(a)).toBe(-1);
    });

    it('treats a [disabled] active element as stale', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        r.setActive(a);
        expect(r.tabindexFor(a)).toBe(0);
        a.setAttribute('disabled', '');
        expect(r.hasActive()).toBe(false);
        expect(r.tabindexFor(a)).toBe(-1);
      } finally {
        a.remove();
      }
    });

    it('treats an aria-disabled="true" active element as stale', () => {
      const r = new RovingTabindex();
      const a = document.createElement('div');
      document.body.append(a);
      try {
        r.setActive(a);
        a.setAttribute('aria-disabled', 'true');
        expect(r.hasActive()).toBe(false);
        expect(r.tabindexFor(a)).toBe(-1);
      } finally {
        a.remove();
      }
    });

    it('discounts an active element that detaches after hasActive read it', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        r.setActive(a);
        expect(r.hasActive()).toBe(true);

        a.remove();

        expect(r.hasActive()).toBe(false);
        expect(r.tabindexFor(a)).toBe(-1);
      } finally {
        a.remove();
      }
    });

    it('reacts to setActive in the hasActive computed', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const has = computed(() => r.hasActive());
        expect(has()).toBe(false);
        r.setActive(a);
        expect(has()).toBe(true);
        r.setActive(null);
        expect(has()).toBe(false);
      } finally {
        a.remove();
      }
    });
  });

  describe('unregister', () => {
    it('clears the active element when it unregisters', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      r.setActive(a);
      r.unregister(a);
      expect(r.active()).toBe(null);
    });

    it('is a no-op when unregistering a non-active element', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      const b = document.createElement('button');
      r.setActive(a);
      r.unregister(b);
      expect(r.active()).toBe(a);
    });
  });

  describe('reconciling active', () => {
    it('nulls active when the active host unregisters', () => {
      const a = document.createElement('button');
      const b = document.createElement('button');
      document.body.append(a, b);
      try {
        const items = signal<readonly HostRovingItemHandle[]>([makeHandle(a), makeHandle(b)]);
        const r = new RovingTabindex(() => items());
        r.setActive(a);
        expect(r.active()).toBe(a);

        items.set([makeHandle(b)]);
        expect(r.active()).toBe(null);
      } finally {
        a.remove();
        b.remove();
      }
    });

    it('nulls active when the active host becomes disabled', () => {
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const dis = signal(false);
        const items = signal<readonly HostRovingItemHandle[]>([{ host: a, disabled: dis }]);
        const r = new RovingTabindex(() => items());
        r.setActive(a);
        expect(r.active()).toBe(a);

        dis.set(true);
        expect(r.active()).toBe(null);
      } finally {
        a.remove();
      }
    });

    it('leaves an enabled, registered active untouched', () => {
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const items = signal<readonly HostRovingItemHandle[]>([makeHandle(a)]);
        const r = new RovingTabindex(() => items());
        r.setActive(a);
        expect(r.active()).toBe(a);
      } finally {
        a.remove();
      }
    });

    describe("fallback: 'nearest'", () => {
      const mountButtons = (n: number): HTMLElement[] => {
        const hosts = Array.from({ length: n }, () => document.createElement('button'));
        document.body.append(...hosts);
        return hosts;
      };

      it('promotes the closest enabled handle before the one that left', () => {
        const [a, b, c, d] = mountButtons(4);
        try {
          const items = signal([makeHandle(a!), makeHandle(b!), makeHandle(c!), makeHandle(d!)]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(c!);
          expect(r.active()).toBe(c);

          items.set([makeHandle(a!), makeHandle(b!), makeHandle(d!)]);
          expect(r.active()).toBe(b);
        } finally {
          [a, b, c, d].forEach((el) => el!.remove());
        }
      });

      it('lands on the surviving ancestor when a contiguous run leaves', () => {
        const [parent, child, grandchild, sibling] = mountButtons(4);
        try {
          const items = signal([
            makeHandle(parent!),
            makeHandle(child!),
            makeHandle(grandchild!),
            makeHandle(sibling!),
          ]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(grandchild!);
          expect(r.active()).toBe(grandchild);

          items.set([makeHandle(parent!), makeHandle(sibling!)]);
          expect(r.active()).toBe(parent);
        } finally {
          [parent, child, grandchild, sibling].forEach((el) => el!.remove());
        }
      });

      it('falls forward to the closest following handle when nothing precedes', () => {
        const [a, b, c] = mountButtons(3);
        try {
          const items = signal([makeHandle(a!), makeHandle(b!, true), makeHandle(c!)]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(a!);
          expect(r.active()).toBe(a);

          items.set([makeHandle(b!, true), makeHandle(c!)]);
          expect(r.active()).toBe(c);
        } finally {
          [a, b, c].forEach((el) => el!.remove());
        }
      });

      it('keeps the departed pointer, so a re-enabled host reclaims the tab stop', () => {
        const [a, b] = mountButtons(2);
        try {
          const disabled = signal(false);
          const items = signal<readonly HostRovingItemHandle[]>([
            makeHandle(a!),
            { host: b!, disabled },
          ]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(b!);
          expect(r.active()).toBe(b);

          disabled.set(true);
          expect(r.active()).toBe(a);

          disabled.set(false);
          expect(r.active()).toBe(b);
        } finally {
          a!.remove();
          b!.remove();
        }
      });

      it('relocates again from the stand-in when the stand-in leaves too', () => {
        const [a, b, c, d] = mountButtons(4);
        try {
          const items = signal([makeHandle(a!), makeHandle(b!), makeHandle(c!), makeHandle(d!)]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(d!);
          expect(r.active()).toBe(d);

          items.set([makeHandle(a!), makeHandle(b!), makeHandle(c!)]);
          expect(r.active()).toBe(c);

          items.set([makeHandle(a!), makeHandle(c!)]);
          expect(r.active()).toBe(c);

          items.set([makeHandle(a!)]);
          expect(r.active()).toBe(a);
        } finally {
          [a, b, c, d].forEach((el) => el!.remove());
        }
      });

      it('nulls active when no enabled handle remains', () => {
        const [a] = mountButtons(1);
        try {
          const disabled = signal(false);
          const items = signal<readonly HostRovingItemHandle[]>([{ host: a!, disabled }]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(a!);
          expect(r.active()).toBe(a);

          disabled.set(true);
          expect(r.active()).toBe(null);
        } finally {
          a!.remove();
        }
      });

      it('ignores unregister, which would otherwise lose the departed position', () => {
        const [a, b, c] = mountButtons(3);
        try {
          const items = signal([makeHandle(a!), makeHandle(b!), makeHandle(c!)]);
          const r = new RovingTabindex(() => items(), { fallback: 'nearest' });
          r.setActive(c!);
          expect(r.active()).toBe(c);

          r.unregister(c!);
          items.set([makeHandle(a!), makeHandle(b!)]);
          expect(r.active()).toBe(b);
        } finally {
          [a, b, c].forEach((el) => el!.remove());
        }
      });
    });

    describe('keyed reads (issue #2808)', () => {
      const mountGroup = (n: number, fallback: 'none' | 'nearest') => {
        const hosts = Array.from({ length: n }, () => document.createElement('button'));
        document.body.append(...hosts);
        const disabled = hosts.map(() => signal(false));
        const items = signal<readonly HostRovingItemHandle[]>(
          hosts.map((host, i) => ({ host, disabled: disabled[i]! })),
        );
        const r = new RovingTabindex(() => items(), { fallback });
        let evaluations = 0;
        const stops = hosts.map((host) =>
          computed(() => {
            evaluations++;
            return r.hasActive() ? r.tabindexFor(host) : null;
          }),
        );
        const active = hosts.map((host) => computed(() => r.isActive(host)));
        const read = () => ({
          stops: stops.map((stop) => stop()),
          active: active.map((flag) => flag()),
        });
        const countMove = (move: () => void): number => {
          read();
          evaluations = 0;
          move();
          read();
          return evaluations;
        };
        return {
          hosts,
          disabled,
          r,
          read,
          countMove,
          cleanup: () => hosts.forEach((host) => host.remove()),
        };
      };

      it('re-evaluates only the two items a move touches, whatever the group size', () => {
        const small = mountGroup(4, 'nearest');
        const large = mountGroup(64, 'nearest');
        try {
          small.r.setActive(small.hosts[1]!);
          large.r.setActive(large.hosts[1]!);

          const smallCost = small.countMove(() => small.r.setActive(small.hosts[2]!));
          const largeCost = large.countMove(() => large.r.setActive(large.hosts[2]!));

          expect(largeCost).toBe(2);
          expect(smallCost).toBe(largeCost);
          expect(large.read().stops.indexOf(0)).toBe(2);
          expect(large.read().stops.filter((stop) => stop === 0)).toHaveLength(1);
        } finally {
          small.cleanup();
          large.cleanup();
        }
      });

      it('hands the tab stop to the stand-in when the active item is disabled in place', () => {
        const group = mountGroup(4, 'nearest');
        try {
          group.r.setActive(group.hosts[2]!);
          expect(group.read().active).toEqual([false, false, true, false]);

          group.disabled[2]!.set(true);

          expect(group.read().active).toEqual([false, true, false, false]);
          expect(group.read().stops).toEqual([-1, 0, -1, -1]);
        } finally {
          group.cleanup();
        }
      });

      it('takes the tab stop back from a stand-in when focus moves elsewhere', () => {
        const group = mountGroup(4, 'nearest');
        try {
          group.r.setActive(group.hosts[2]!);
          group.disabled[2]!.set(true);
          expect(group.read().active).toEqual([false, true, false, false]);

          group.r.setActive(group.hosts[3]!);

          expect(group.read().active).toEqual([false, false, false, true]);
          expect(group.read().stops).toEqual([-1, -1, -1, 0]);
        } finally {
          group.cleanup();
        }
      });

      it('owns the tab stop once an element named while disabled is re-enabled', () => {
        const group = mountGroup(3, 'none');
        try {
          group.disabled[1]!.set(true);
          group.r.setActive(group.hosts[1]!);
          expect(group.read().stops).toEqual([null, null, null]);

          group.disabled[1]!.set(false);

          expect(group.read().stops).toEqual([-1, 0, -1]);
          expect(group.read().active).toEqual([false, true, false]);
        } finally {
          group.cleanup();
        }
      });
    });

    it('never reads the item list while nothing is active', () => {
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const items = signal<readonly HostRovingItemHandle[]>([makeHandle(a)]);
        let reads = 0;
        const r = new RovingTabindex(() => {
          reads++;
          return items();
        });

        expect(r.active()).toBe(null);
        expect(r.hasActive()).toBe(false);
        items.set([makeHandle(a)]);
        expect(r.active()).toBe(null);
        expect(reads).toBe(0);

        r.setActive(a);

        expect(r.active()).toBe(a);
        expect(reads).toBe(1);
      } finally {
        a.remove();
      }
    });

    it('is a pass-through of the raw pointer with no items producer', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      r.setActive(a);
      expect(r.active()).toBe(a);
    });

    it('reflects a disconnected active element without any dependency change', () => {
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const items = signal<readonly HostRovingItemHandle[]>([makeHandle(a)]);
        const r = new RovingTabindex(() => items());
        r.setActive(a);
        expect(r.hasActive()).toBe(true);
        expect(r.tabindexFor(a)).toBe(0);

        a.remove();
        expect(r.tabindexFor(a)).toBe(-1);

        items.set([]);
        expect(r.active()).toBe(null);
        expect(r.hasActive()).toBe(false);
      } finally {
        a.remove();
      }
    });
  });
});
