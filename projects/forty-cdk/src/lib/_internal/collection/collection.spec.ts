import { Collection } from './collection';

interface Handle {
  readonly host: HTMLElement;
  readonly id: string;
}

function handle(id: string, host: HTMLElement): Handle {
  return { id, host };
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

  it('sorts items by DOM document order regardless of registration order', () => {
    const col = new Collection<Handle>();
    col.register(handle('c', c));
    col.register(handle('a', a));
    col.register(handle('b', b));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns items in registration order when there is fewer than 2', () => {
    const col = new Collection<Handle>();
    const single = handle('a', a);
    col.register(single);
    expect(col.items()).toEqual([single]);
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

  it('reorders on DOM mutation: items() reflects current document order on read', () => {
    const col = new Collection<Handle>();
    col.register(handle('a', a));
    col.register(handle('b', b));
    col.register(handle('c', c));

    expect(col.items().map((h) => h.id)).toEqual(['a', 'b', 'c']);

    // Move c before a in the DOM, then re-trigger a read by toggling the
    // signal (mutation alone doesn't invalidate the computed; this matches
    // the Angular pattern where structural changes go through register /
    // unregister, but verify the sort takes today's DOM as truth).
    host.insertBefore(c, a);
    const ghost = handle('ghost', document.createElement('div'));
    col.register(ghost);
    col.unregister(ghost);

    expect(col.items().map((h) => h.id)).toEqual(['c', 'a', 'b']);
  });

  it('findByHost returns the matching handle or undefined', () => {
    const col = new Collection<Handle>();
    const ha = handle('a', a);
    col.register(ha);

    expect(col.findByHost(a)).toBe(ha);
    expect(col.findByHost(b)).toBeUndefined();
  });

  it('indexOfHost returns the DOM-ordered index', () => {
    const col = new Collection<Handle>();
    col.register(handle('c', c));
    col.register(handle('a', a));

    expect(col.indexOfHost(a)).toBe(0);
    expect(col.indexOfHost(c)).toBe(1);
    expect(col.indexOfHost(b)).toBe(-1);
  });
});
