import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush } from '../../../test-utils';
import { ForDrawerStack } from './drawer-stack';

@Component({ template: `` })
class StackHost {
  readonly stack = inject(ForDrawerStack);
}

async function createHost(): Promise<{
  stack: ForDrawerStack;
  fixture: ComponentFixture<StackHost>;
}> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(StackHost);
  await flush(fixture);
  return { stack: fixture.componentInstance.stack, fixture };
}

function makeHost(id: string): HTMLElement {
  const el = document.createElement('div');
  el.dataset['testid'] = id;
  document.body.appendChild(el);
  return el;
}

describe('ForDrawerStack', () => {
  const created: HTMLElement[] = [];
  function track(el: HTMLElement): HTMLElement {
    created.push(el);
    return el;
  }

  afterEach(() => {
    for (const el of created.splice(0)) el.remove();
  });

  it('exposes an empty stack initially', async () => {
    const { stack } = await createHost();
    expect(stack.stack()).toEqual([]);
  });

  it('push(root) returns depth 0 and reflects in the signal', async () => {
    const { stack, fixture } = await createHost();
    const root = track(makeHost('root'));

    const handle = stack.push({
      host: root,
      side: 'bottom',
      scaleBackground: false,
      parent: null,
    });
    await flush(fixture);

    expect(handle.depth).toBe(0);
    expect(stack.stack()).toHaveLength(1);
    expect(stack.stack()[0]?.host).toBe(root);
  });

  it('child push receives depth = parentDepth + 1', async () => {
    const { stack } = await createHost();
    const root = track(makeHost('root'));
    const child = track(makeHost('child'));
    const grandchild = track(makeHost('grandchild'));

    const rootHandle = stack.push({
      host: root,
      side: 'bottom',
      scaleBackground: false,
      parent: null,
    });
    const childHandle = stack.push({
      host: child,
      side: 'bottom',
      scaleBackground: false,
      parent: root,
    });
    const grandchildHandle = stack.push({
      host: grandchild,
      side: 'bottom',
      scaleBackground: false,
      parent: child,
    });

    expect(rootHandle.depth).toBe(0);
    expect(childHandle.depth).toBe(1);
    expect(grandchildHandle.depth).toBe(2);
  });

  it('cleanup pops in LIFO order and updates the signal', async () => {
    const { stack, fixture } = await createHost();
    const root = track(makeHost('root'));
    const child = track(makeHost('child'));

    const rootHandle = stack.push({
      host: root,
      side: 'bottom',
      scaleBackground: false,
      parent: null,
    });
    const childHandle = stack.push({
      host: child,
      side: 'bottom',
      scaleBackground: false,
      parent: root,
    });
    await flush(fixture);
    expect(stack.stack()).toHaveLength(2);

    childHandle.cleanup();
    await flush(fixture);
    expect(stack.stack().map((n) => n.host)).toEqual([root]);

    rootHandle.cleanup();
    await flush(fixture);
    expect(stack.stack()).toEqual([]);
  });

  it('cleanup is idempotent on an already-removed node', async () => {
    const { stack } = await createHost();
    const root = track(makeHost('root'));
    const handle = stack.push({
      host: root,
      side: 'bottom',
      scaleBackground: false,
      parent: null,
    });
    handle.cleanup();
    expect(() => handle.cleanup()).not.toThrow();
    expect(stack.stack()).toEqual([]);
  });

  it('throws when a parent is cleaned while a descendant is still registered', async () => {
    const { stack } = await createHost();
    const root = track(makeHost('root'));
    const child = track(makeHost('child'));

    const rootHandle = stack.push({
      host: root,
      side: 'bottom',
      scaleBackground: false,
      parent: null,
    });
    stack.push({
      host: child,
      side: 'bottom',
      scaleBackground: false,
      parent: root,
    });

    expect(() => rootHandle.cleanup()).toThrow(/out-of-order cleanup/);
  });

  it('parent → cleanup throws even for indirect descendants', async () => {
    const { stack } = await createHost();
    const root = track(makeHost('root'));
    const child = track(makeHost('child'));
    const grandchild = track(makeHost('grandchild'));

    const rootHandle = stack.push({
      host: root,
      side: 'bottom',
      scaleBackground: false,
      parent: null,
    });
    stack.push({
      host: child,
      side: 'bottom',
      scaleBackground: false,
      parent: root,
    });
    stack.push({
      host: grandchild,
      side: 'bottom',
      scaleBackground: false,
      parent: child,
    });

    expect(() => rootHandle.cleanup()).toThrow(/out-of-order cleanup/);
  });

  it('preserves node metadata (side, scaleBackground, parent)', async () => {
    const { stack } = await createHost();
    const root = track(makeHost('root'));
    const child = track(makeHost('child'));

    stack.push({
      host: root,
      side: 'right',
      scaleBackground: true,
      parent: null,
    });
    stack.push({
      host: child,
      side: 'top',
      scaleBackground: false,
      parent: root,
    });

    const [rootNode, childNode] = stack.stack();
    expect(rootNode?.side).toBe('right');
    expect(rootNode?.scaleBackground).toBe(true);
    expect(rootNode?.parent).toBeNull();
    expect(childNode?.side).toBe('top');
    expect(childNode?.scaleBackground).toBe(false);
    expect(childNode?.parent).toBe(root);
  });
});
