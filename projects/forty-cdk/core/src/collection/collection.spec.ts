import { Component, Directive, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Collection } from './collection';

interface Handle {
  readonly host: HTMLElement;
  readonly id: string;
}

function handle(id: string, host: HTMLElement): Handle {
  return { id, host };
}

function createCollection(): Collection<Handle> {
  return TestBed.runInInjectionContext(() => new Collection<Handle>());
}

function waitForMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

describe('Collection', () => {
  let host: HTMLElement;
  let a: HTMLElement;
  let b: HTMLElement;
  let c: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    a = document.createElement('div');
    a.id = 'a';
    b = document.createElement('div');
    b.id = 'b';
    c = document.createElement('div');
    c.id = 'c';
    host.append(a, b, c);
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts empty', () => {
    const col = createCollection();
    expect(col.items()).toEqual([]);
  });

  it('returns items in DOM document order regardless of registration order', () => {
    const col = createCollection();
    col.register(handle('c', c));
    col.register(handle('a', a));
    col.register(handle('b', b));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the sole item when there is fewer than 2', () => {
    const col = createCollection();
    const single = handle('a', a);
    col.register(single);
    expect(col.items()).toEqual([single]);
  });

  it('reflects the new DOM order after the hosts are reordered post-registration', async () => {
    const col = createCollection();
    col.register(handle('a', a));
    col.register(handle('b', b));
    col.register(handle('c', c));
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);
    expect(col.indexOfHost(c)).toBe(2);

    host.append(c, a, b);
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['c', 'a', 'b']);
    expect(col.indexOfHost(c)).toBe(0);
    expect(col.indexOfHost(b)).toBe(2);
  });

  it('keeps detached hosts at the end in a stable relative order', () => {
    const col = createCollection();
    const detached = document.createElement('div');
    col.register(handle('detached', detached));
    col.register(handle('b', b));
    col.register(handle('a', a));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'detached']);
  });

  it('deduplicates double-registers', () => {
    const col = createCollection();
    const h = handle('a', a);
    col.register(h);
    col.register(h);
    expect(col.items()).toEqual([h]);
  });

  it('removes by reference on unregister', () => {
    const col = createCollection();
    const ha = handle('a', a);
    const hb = handle('b', b);
    col.register(ha);
    col.register(hb);

    col.unregister(ha);
    expect(col.items()).toEqual([hb]);

    col.unregister(hb);
    expect(col.items()).toEqual([]);
  });

  it('unregistering an unknown handle is a no-op', () => {
    const col = createCollection();
    const ha = handle('a', a);
    col.register(ha);

    const before = col.items();
    col.unregister(handle('b', b));
    expect(col.items()).toBe(before);
    expect(col.items()).toEqual([ha]);
  });

  it('allows re-registering a handle after it is unregistered', () => {
    const col = createCollection();
    const ha = handle('a', a);
    col.register(ha);
    col.unregister(ha);
    expect(col.items()).toEqual([]);

    col.register(ha);
    expect(col.items()).toEqual([ha]);

    col.register(ha);
    expect(col.items()).toEqual([ha]);
  });

  it('returns the same array reference across consecutive reads (no per-read allocation)', () => {
    const col = createCollection();
    col.register(handle('a', a));
    col.register(handle('b', b));

    const first = col.items();
    const second = col.items();
    expect(second).toBe(first);

    col.register(handle('c', c));
    const third = col.items();
    expect(third).not.toBe(first);
    expect(col.items()).toBe(third);
  });

  it('findByHost returns the matching handle or undefined', () => {
    const col = createCollection();
    const ha = handle('a', a);
    col.register(ha);

    expect(col.findByHost(a)).toBe(ha);
    expect(col.findByHost(b)).toBeUndefined();
  });

  it('indexOfHost returns the DOM document-order index', () => {
    const col = createCollection();
    col.register(handle('c', c));
    col.register(handle('a', a));

    expect(col.indexOfHost(a)).toBe(0);
    expect(col.indexOfHost(c)).toBe(1);
    expect(col.indexOfHost(b)).toBe(-1);
  });

  it('resolves a host shared by two handles to the first in document order', () => {
    const col = createCollection();
    const second = handle('a2', a);
    col.register(second);
    col.register(handle('a1', a));
    col.register(handle('b', b));

    expect(col.indexOfHost(a)).toBe(0);
    expect(col.findByHost(a)).toBe(second);
    expect(col.indexOfHost(b)).toBe(2);
  });

  it('re-resolves lookups after an unregister', () => {
    const col = createCollection();
    const ha = handle('a', a);
    col.register(ha);
    col.register(handle('b', b));
    col.register(handle('c', c));
    expect(col.indexOfHost(c)).toBe(2);

    col.unregister(ha);

    expect(col.indexOfHost(a)).toBe(-1);
    expect(col.findByHost(a)).toBeUndefined();
    expect(col.indexOfHost(c)).toBe(1);
  });

  it('observes the parent without subtree, so a nested mutation does not invalidate it', async () => {
    const col = createCollection();
    col.register(handle('a', a));
    col.register(handle('b', b));

    const before = col.items();

    const grandchild = document.createElement('div');
    a.appendChild(grandchild);
    await waitForMutationObserver();

    expect(col.items()).toBe(before);
  });

  it('returns the same reference across a childList mutation that leaves order unchanged', async () => {
    const col = createCollection();
    col.register(handle('a', a));
    col.register(handle('b', b));
    col.register(handle('c', c));
    await waitForMutationObserver();

    const before = col.items();
    expect(before.map((h) => h.id)).toEqual(['a', 'b', 'c']);

    const extra = document.createElement('div');
    host.appendChild(extra);
    await waitForMutationObserver();

    const after = col.items();
    expect(Object.is(before, after)).toBe(true);
    expect(after.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('invalidates only the owning collection when sibling subtrees mutate', async () => {
    const outer = createCollection();
    const innerHost = document.createElement('div');
    const x = document.createElement('div');
    const y = document.createElement('div');
    innerHost.append(x, y);
    host.appendChild(innerHost);

    const inner = createCollection();
    outer.register(handle('a', a));
    outer.register(handle('b', b));
    inner.register(handle('x', x));
    inner.register(handle('y', y));
    await waitForMutationObserver();

    const outerBefore = outer.items();
    const innerBefore = inner.items();

    innerHost.append(y, x);
    await waitForMutationObserver();

    expect(inner.items().map((h) => h.id)).toEqual(['y', 'x']);
    expect(inner.items()).not.toBe(innerBefore);
    expect(outer.items()).toBe(outerBefore);
  });

  it('reflects the new DOM order after intermediate wrappers are reordered', async () => {
    const ul = document.createElement('ul');
    const wrappers: HTMLLIElement[] = [];
    const buttons: HTMLButtonElement[] = [];
    for (const id of ['a', 'b', 'c']) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.id = id;
      li.appendChild(button);
      ul.appendChild(li);
      wrappers.push(li);
      buttons.push(button);
    }
    host.appendChild(ul);

    const col = createCollection();
    col.register(handle('a', buttons[0]!));
    col.register(handle('b', buttons[1]!));
    col.register(handle('c', buttons[2]!));
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);

    ul.insertBefore(wrappers[2]!, wrappers[0]!);
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['c', 'a', 'b']);
    expect(col.indexOfHost(buttons[2]!)).toBe(0);
    expect(col.indexOfHost(buttons[1]!)).toBe(2);
  });

  it('re-anchors the observer after a host re-parents, so later reorders still update items()', async () => {
    const container = document.createElement('div');
    const branch1 = document.createElement('div');
    const branch2 = document.createElement('div');
    branch1.append(a, b, c);
    container.append(branch1, branch2);
    host.appendChild(container);

    const col = createCollection();
    col.register(handle('a', a));
    col.register(handle('b', b));
    col.register(handle('c', c));
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);

    branch2.appendChild(a);
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['b', 'c', 'a']);
    expect(col.indexOfHost(a)).toBe(2);

    container.insertBefore(branch2, branch1);
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);
    expect(col.indexOfHost(a)).toBe(0);
    expect(col.indexOfHost(c)).toBe(2);
  });

  it('does not invalidate when a sibling wrapper subtree below the common ancestor mutates', async () => {
    const ul = document.createElement('ul');
    const buttons: HTMLButtonElement[] = [];
    for (const id of ['a', 'b']) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.id = id;
      li.appendChild(button);
      ul.appendChild(li);
      buttons.push(button);
    }
    host.appendChild(ul);

    const col = createCollection();
    col.register(handle('a', buttons[0]!));
    col.register(handle('b', buttons[1]!));
    await waitForMutationObserver();

    const before = col.items();

    buttons[0]!.appendChild(document.createElement('span'));
    await waitForMutationObserver();

    expect(col.items()).toBe(before);
  });

  it('disconnects the observer and clears membership on destroy', async () => {
    const col = createCollection();
    col.register(handle('a', a));
    col.register(handle('b', b));

    col.destroy();
    expect(col.items()).toEqual([]);

    host.append(c, a, b);
    await waitForMutationObserver();
    expect(col.items()).toEqual([]);

    col.register(handle('a', a));
    expect(col.items()).toEqual([]);
  });

  describe('epoch-based membership (#1153)', () => {
    it('resolves DOM order for many handles registered out of order', () => {
      const col = createCollection();
      const hosts: HTMLElement[] = [];
      for (let i = 0; i < 50; i++) {
        const el = document.createElement('div');
        el.id = `n${i}`;
        host.appendChild(el);
        hosts.push(el);
      }
      for (let i = hosts.length - 1; i >= 0; i--) {
        col.register(handle(`n${i}`, hosts[i]!));
      }

      expect(col.items().map((h) => h.id)).toEqual(hosts.map((_, i) => `n${i}`));
    });

    it('dedups a double-register without copying membership', () => {
      const col = createCollection();
      const ha = handle('a', a);
      const before = col.items();
      col.register(ha);
      col.register(ha);
      col.register(ha);

      expect(col.items().map((h) => h.id)).toEqual(['a']);
      expect(col.items()).not.toBe(before);
    });

    it('unregister removes and reflects synchronously', () => {
      const col = createCollection();
      const ha = handle('a', a);
      const hb = handle('b', b);
      col.register(ha);
      col.register(hb);
      expect(col.items().map((h) => h.id)).toEqual(['a', 'b']);

      col.unregister(ha);
      expect(col.items().map((h) => h.id)).toEqual(['b']);
    });

    it('destroy clears membership and ignores later register', () => {
      const col = createCollection();
      col.register(handle('a', a));
      col.register(handle('b', b));

      col.destroy();
      expect(col.items()).toEqual([]);

      col.register(handle('c', c));
      expect(col.items()).toEqual([]);
    });

    it('reflects membership synchronously after register (before the microtask flushes)', () => {
      const col = createCollection();
      col.register(handle('a', a));
      col.register(handle('b', b));

      expect(col.items().map((h) => h.id)).toEqual(['a', 'b']);
    });

    it('coalesces a burst of same-turn registrations into a single observer resync', async () => {
      const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
      try {
        const col = createCollection();
        col.register(handle('a', a));
        col.register(handle('b', b));
        col.register(handle('c', c));

        expect(observeSpy).not.toHaveBeenCalled();

        await flushMicrotasks();

        expect(observeSpy).toHaveBeenCalledTimes(1);
        col.destroy();
      } finally {
        observeSpy.mockRestore();
      }
    });

    it('does not resync the observer after destroy cancels the pending microtask', async () => {
      const observeSpy = vi.spyOn(MutationObserver.prototype, 'observe');
      try {
        const col = createCollection();
        col.register(handle('a', a));
        col.register(handle('b', b));
        col.destroy();

        await flushMicrotasks();

        expect(observeSpy).not.toHaveBeenCalled();
      } finally {
        observeSpy.mockRestore();
      }
    });
  });

  it('disconnects the observer when the owning injection context is destroyed', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    let col!: Collection<Handle>;

    @Directive({ selector: '[owner]' })
    class OwnerDir {
      readonly collection = new Collection<Handle>();
      constructor() {
        col = this.collection;
      }
    }

    @Component({ selector: 'host-cmp', imports: [OwnerDir], template: '<div owner></div>' })
    class HostCmp {}

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();

    col.register(handle('a', a));
    col.register(handle('b', b));
    expect(col.items().map((h) => h.id)).toEqual(['a', 'b']);

    fixture.destroy();

    expect(col.items()).toEqual([]);
    host.append(c, a, b);
    await waitForMutationObserver();
    expect(col.items()).toEqual([]);
  });

  it('rejects construction outside an injection context instead of skipping teardown', () => {
    expect(() => new Collection<Handle>()).toThrowError(/NG0203/);
  });

  describe('non-element hosts (#1562)', () => {
    interface NodeHandle {
      readonly host: Node;
      readonly id: string;
    }

    function nodeHandle(id: string, host: Node): NodeHandle {
      return { id, host };
    }

    function createNodeCollection(): Collection<NodeHandle> {
      return TestBed.runInInjectionContext(() => new Collection<NodeHandle>());
    }

    it('orders a comment anchor against element hosts by document position', () => {
      const anchor = document.createComment('container');
      host.insertBefore(anchor, b);
      const col = createNodeCollection();
      col.register(nodeHandle('c', c));
      col.register(nodeHandle('anchor', anchor));
      col.register(nodeHandle('a', a));

      expect(col.items().map((h) => h.id)).toEqual(['a', 'anchor', 'c']);
    });

    it('resolves lookups keyed by a comment anchor', () => {
      const anchor = document.createComment('container');
      host.appendChild(anchor);
      const col = createNodeCollection();
      const anchored = nodeHandle('anchor', anchor);
      col.register(nodeHandle('a', a));
      col.register(anchored);

      expect(col.findByHost(anchor)).toBe(anchored);
      expect(col.indexOfHost(anchor)).toBe(1);
    });

    it('keeps a detached comment anchor at the end', () => {
      const detached = document.createComment('detached');
      const col = createNodeCollection();
      col.register(nodeHandle('detached', detached));
      col.register(nodeHandle('b', b));

      expect(col.items().map((h) => h.id)).toEqual(['b', 'detached']);
    });

    it('re-orders comment anchors after their parent reorders its children', async () => {
      const first = document.createComment('first');
      const second = document.createComment('second');
      host.append(first, second);
      const col = createNodeCollection();
      col.register(nodeHandle('first', first));
      col.register(nodeHandle('second', second));
      await waitForMutationObserver();
      expect(col.items().map((h) => h.id)).toEqual(['first', 'second']);

      host.append(second, first);
      await waitForMutationObserver();

      expect(col.items().map((h) => h.id)).toEqual(['second', 'first']);
    });
  });
});
