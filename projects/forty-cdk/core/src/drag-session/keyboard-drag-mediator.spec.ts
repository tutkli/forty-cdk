import type { DestroyRef } from '@angular/core';

import {
  createKeyboardDragMediator,
  type KeyboardDragMediatorConfig,
} from './keyboard-drag-mediator';

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
  let inside: HTMLButtonElement;
  let outside: HTMLButtonElement;
  let destroy: { ref: DestroyRef; runDestroy: () => void };

  function wire(overrides: Partial<KeyboardDragMediatorConfig> = {}) {
    const callbacks = {
      onIdleKeydown: vi.fn(),
      onLiftedKeydown: vi.fn(),
      onFocusLeave: vi.fn(),
    };
    createKeyboardDragMediator({
      host,
      document,
      isBrowser: true,
      destroyRef: destroy.ref,
      isLifted: () => false,
      ...callbacks,
      ...overrides,
    });
    return callbacks;
  }

  function focusOut(target: HTMLElement, relatedTarget: EventTarget | null = null): void {
    target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
  }

  beforeEach(() => {
    host = document.createElement('div');
    inside = document.createElement('button');
    host.appendChild(inside);
    outside = document.createElement('button');
    document.body.append(host, outside);
    destroy = fakeDestroyRef();
  });

  afterEach(() => {
    host.remove();
    outside.remove();
  });

  it('does nothing on the server (isBrowser false)', () => {
    const { onIdleKeydown } = wire({ isBrowser: false });

    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(onIdleKeydown).not.toHaveBeenCalled();
  });

  it('routes keydown to onIdleKeydown while not lifted', () => {
    const { onIdleKeydown, onLiftedKeydown } = wire({ isLifted: () => false });

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onIdleKeydown).toHaveBeenCalledTimes(1);
    expect(onLiftedKeydown).not.toHaveBeenCalled();
  });

  it('routes keydown to onLiftedKeydown while lifted', () => {
    const { onIdleKeydown, onLiftedKeydown } = wire({ isLifted: () => true });

    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onLiftedKeydown).toHaveBeenCalledTimes(1);
    expect(onIdleKeydown).not.toHaveBeenCalled();
  });

  it('listens in the capture phase so a keydown on a descendant is intercepted first', () => {
    const { onIdleKeydown } = wire({ isLifted: () => false });

    inside.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onIdleKeydown).toHaveBeenCalledTimes(1);
  });

  it('reports a leave as soon as the focusout names a destination outside the host', () => {
    const { onFocusLeave } = wire({ isLifted: () => true });

    focusOut(inside, outside);
    expect(onFocusLeave).toHaveBeenCalledTimes(1);
  });

  it('reports no leave when the focusout names a destination inside the host', async () => {
    const { onFocusLeave } = wire({ isLifted: () => true });

    focusOut(host, inside);
    await Promise.resolve();
    expect(onFocusLeave).not.toHaveBeenCalled();
  });

  it('reports no leave for a focusout with no destination while focus is still inside', async () => {
    const { onFocusLeave } = wire({ isLifted: () => true });
    inside.focus();

    focusOut(inside);
    await Promise.resolve();
    expect(onFocusLeave).not.toHaveBeenCalled();
  });

  it('reports a leave for a focusout with no destination once focus has settled outside', async () => {
    const { onFocusLeave } = wire({ isLifted: () => true });
    outside.focus();

    focusOut(inside);
    expect(onFocusLeave).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(onFocusLeave).toHaveBeenCalledTimes(1);
  });

  it('reports no leave while no drag is in progress, on either channel', async () => {
    const { onFocusLeave } = wire({ isLifted: () => false });
    outside.focus();

    focusOut(inside, outside);
    focusOut(inside);
    await Promise.resolve();
    expect(onFocusLeave).not.toHaveBeenCalled();
  });

  it('reports no leave when the drag ended before the deferred check ran', async () => {
    let lifted = true;
    const { onFocusLeave } = wire({ isLifted: () => lifted });
    outside.focus();

    focusOut(inside);
    lifted = false;
    await Promise.resolve();
    expect(onFocusLeave).not.toHaveBeenCalled();
  });

  it('reports no leave once the owner is destroyed', async () => {
    const { onFocusLeave } = wire({ isLifted: () => true });
    outside.focus();

    focusOut(inside);
    destroy.runDestroy();
    await Promise.resolve();
    expect(onFocusLeave).not.toHaveBeenCalled();
  });

  it('removes its listeners on destroy', () => {
    const { onIdleKeydown } = wire({ isLifted: () => false });

    destroy.runDestroy();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(onIdleKeydown).not.toHaveBeenCalled();
  });
});
