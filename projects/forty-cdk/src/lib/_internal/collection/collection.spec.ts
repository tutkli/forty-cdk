import { Collection } from './collection';

interface Handle {
  readonly host: HTMLElement;
  readonly id: string;
}

function handle(id: string, host: HTMLElement): Handle {
  return { id, host };
}

function waitForMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
    const col = new Collection<Handle>();
    expect(col.items()).toEqual([]);
  });

  it('returns items in DOM document order regardless of registration order', () => {
    const col = new Collection<Handle>();
    col.register(handle('c', c));
    col.register(handle('a', a));
    col.register(handle('b', b));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the sole item when there is fewer than 2', () => {
    const col = new Collection<Handle>();
    const single = handle('a', a);
    col.register(single);
    expect(col.items()).toEqual([single]);
  });

  it('reflects the new DOM order after the hosts are reordered post-registration', async () => {
    const col = new Collection<Handle>();
    col.register(handle('a', a));
    col.register(handle('b', b));
    col.register(handle('c', c));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);
    expect(col.indexOfHost(c)).toBe(2);

    host.append(c, a, b);
    await waitForMutationObserver();

    expect(col.items().map((h) => h.id)).toEqual(['c', 'a', 'b']);
    expect(col.indexOfHost(c)).toBe(0);
    expect(col.indexOfHost(b)).toBe(2);
  });

  it('keeps detached hosts at the end in a stable relative order', () => {
    const col = new Collection<Handle>();
    const detached = document.createElement('div');
    col.register(handle('detached', detached));
    col.register(handle('b', b));
    col.register(handle('a', a));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'detached']);
  });

  it('deduplicates double-registers', () => {
    const col = new Collection<Handle>();
    const h = handle('a', a);
    col.register(h);
    col.register(h);
    expect(col.items()).toEqual([h]);
  });

  it('removes by reference on unregister', () => {
    const col = new Collection<Handle>();
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
    const col = new Collection<Handle>();
    const ha = handle('a', a);
    col.register(ha);

    const before = col.items();
    col.unregister(handle('b', b));
    expect(col.items()).toBe(before);
    expect(col.items()).toEqual([ha]);
  });

  it('allows re-registering a handle after it is unregistered', () => {
    const col = new Collection<Handle>();
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
    const col = new Collection<Handle>();
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
    const col = new Collection<Handle>();
    const ha = handle('a', a);
    col.register(ha);

    expect(col.findByHost(a)).toBe(ha);
    expect(col.findByHost(b)).toBeUndefined();
  });

  it('indexOfHost returns the DOM document-order index', () => {
    const col = new Collection<Handle>();
    col.register(handle('c', c));
    col.register(handle('a', a));

    expect(col.indexOfHost(a)).toBe(0);
    expect(col.indexOfHost(c)).toBe(1);
    expect(col.indexOfHost(b)).toBe(-1);
  });
});