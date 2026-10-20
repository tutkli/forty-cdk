import { signal, type WritableSignal } from '@angular/core';

import { type RootedHandle, RootedRegistry } from './rooted-registry';

interface Root {
  readonly name: string;
}

interface Handle extends RootedHandle<Root> {
  readonly name: string;
}

function makeHandle(name: string, root: Root | null): [Handle, WritableSignal<Root | null>] {
  const resolved = signal<Root | null>(root);
  return [{ name, root: resolved.asReadonly() }, resolved];
}

describe('RootedRegistry', () => {
  const a: Root = { name: 'a' };
  const b: Root = { name: 'b' };

  it('lists the handles resolving to a root, oldest first', () => {
    const registry = new RootedRegistry<Root, Handle>();
    const [first] = makeHandle('first', a);
    const [other] = makeHandle('other', b);
    const [second] = makeHandle('second', a);
    registry.add(first);
    registry.add(other);
    registry.add(second);

    expect(registry.of(a)()).toEqual([first, second]);
    expect(registry.of(b)()).toEqual([other]);
  });

  it('lists nothing for a root no handle resolves to', () => {
    const registry = new RootedRegistry<Root, Handle>();
    registry.add(makeHandle('only', a)[0]);

    expect(registry.of(b)()).toEqual([]);
  });

  it('moves a handle to the root it resolves to after a change', () => {
    const registry = new RootedRegistry<Root, Handle>();
    const [moving, resolved] = makeHandle('moving', a);
    registry.add(moving);
    const ofA = registry.of(a);
    const ofB = registry.of(b);
    expect(ofA()).toEqual([moving]);

    resolved.set(b);

    expect(ofA()).toEqual([]);
    expect(ofB()).toEqual([moving]);
  });

  it('lists a handle under no root while it resolves none', () => {
    const registry = new RootedRegistry<Root, Handle>();
    const [pending, resolved] = makeHandle('pending', null);
    registry.add(pending);
    const ofA = registry.of(a);
    expect(ofA()).toEqual([]);

    resolved.set(a);

    expect(ofA()).toEqual([pending]);
  });

  it('drops a removed handle and ignores one it never held', () => {
    const registry = new RootedRegistry<Root, Handle>();
    const [kept] = makeHandle('kept', a);
    const [removed] = makeHandle('removed', a);
    registry.add(kept);
    registry.add(removed);
    const ofA = registry.of(a);

    registry.remove(removed);
    registry.remove(makeHandle('stranger', a)[0]);

    expect(ofA()).toEqual([kept]);
  });

  it('keeps the same list while only another root changes', () => {
    const registry = new RootedRegistry<Root, Handle>();
    const [mine] = makeHandle('mine', a);
    registry.add(mine);
    const ofA = registry.of(a);
    const before = ofA();

    registry.add(makeHandle('theirs', b)[0]);

    expect(ofA()).toBe(before);
  });
});
