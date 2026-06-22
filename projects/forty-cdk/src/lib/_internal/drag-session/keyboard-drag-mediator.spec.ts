import type { DestroyRef } from '@angular/core';

import { createKeyboardDragMediator } from './keyboard-drag-mediator';

function fakeDestroyRef(): { ref: DestroyRef; runDestroy: () => void } {
  const callbacks: Array<() => void> = [];
  const ref = {
    onDestroy: (cb: () => void) => {
      callbacks.push(cb);
      return () => {};
    },
  } as unknown as DestroyRef;
  return { ref, runDestroy: () => callbacks.forEach((cb) => cb()) };
}

describe('createKeyboardDragMediator', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('does nothing on the server (isBrowser false)', () => {
    const onIdleKeydown = vi.fn();
    createKeyboardDragMediator({
      host,
      isBrowser: false,
      destroyRef: fakeDestroyRef().ref,
      isLifted: () => false,
      onIdleKeydown,
      onLiftedKeydown: vi.fn(),
      onFocusOut: vi.fn(),
    });

    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(onIdleKeydown).not.toHaveBeenCalled();
  });

  it('routes keydown to onIdleKeydown while not lifted', () => {
    const onIdleKeydown = vi.fn();
    const onLiftedKeydown = vi.fn();
    createKeyboardDragMediator({
      host,
      isBrowser: true,
      destroyRef: fakeDestroyRef().ref,
      isLifted: () => false,
      onIdleKeydown,
      onLiftedKeydown,
      onFocusOut: vi.fn(),
    });

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onIdleKeydown).toHaveBeenCalledTimes(1);
    expect(onLiftedKeydown).not.toHaveBeenCalled();
  });

  it('routes keydown to onLiftedKeydown while lifted', () => {
    const onIdleKeydown = vi.fn();
    const onLiftedKeydown = vi.fn();
    createKeyboardDragMediator({
      host,
      isBrowser: true,
      destroyRef: fakeDestroyRef().ref,
      isLifted: () => true,
      onIdleKeydown,
      onLiftedKeydown,
      onFocusOut: vi.fn(),
    });

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onLiftedKeydown).toHaveBeenCalledTimes(1);
    expect(onIdleKeydown).not.toHaveBeenCalled();
  });

  it('listens in the capture phase so a keydown on a descendant is intercepted first', () => {
    const child = document.createElement('button');
    host.appendChild(child);
    const onIdleKeydown = vi.fn();
    createKeyboardDragMediator({
      host,
      isBrowser: true,
      destroyRef: fakeDestroyRef().ref,
      isLifted: () => false,
      onIdleKeydown,
      onLiftedKeydown: vi.fn(),
      onFocusOut: vi.fn(),
    });

    child.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onIdleKeydown).toHaveBeenCalledTimes(1);
  });

  it('forwards focusout to onFocusOut', () => {
    const onFocusOut = vi.fn();
    createKeyboardDragMediator({
      host,
      isBrowser: true,
      destroyRef: fakeDestroyRef().ref,
      isLifted: () => false,
      onIdleKeydown: vi.fn(),
      onLiftedKeydown: vi.fn(),
      onFocusOut,
    });

    host.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(onFocusOut).toHaveBeenCalledTimes(1);
  });

  it('removes its listeners on destroy', () => {
    const onIdleKeydown = vi.fn();
    const { ref, runDestroy } = fakeDestroyRef();
    createKeyboardDragMediator({
      host,
      isBrowser: true,
      destroyRef: ref,
      isLifted: () => false,
      onIdleKeydown,
      onLiftedKeydown: vi.fn(),
      onFocusOut: vi.fn(),
    });

    runDestroy();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(onIdleKeydown).not.toHaveBeenCalled();
  });
});
