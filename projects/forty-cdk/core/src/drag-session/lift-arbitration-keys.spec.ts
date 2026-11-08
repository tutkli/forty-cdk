import { consumeUnmappedLiftedKey, isLiftedPassthroughKey } from './lift-arbitration';

function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
}

function consumed(event: KeyboardEvent): { prevented: boolean; reachedChild: boolean } {
  const parent = document.createElement('div');
  const child = document.createElement('button');
  parent.append(child);
  let reachedChild = false;
  child.addEventListener('keydown', () => {
    reachedChild = true;
  });
  parent.addEventListener('keydown', consumeUnmappedLiftedKey, { capture: true });
  child.dispatchEvent(event);
  return { prevented: event.defaultPrevented, reachedChild };
}

describe('isLiftedPassthroughKey', () => {
  it('passes Ctrl / Cmd / Alt chords, function keys and IME composition keys through', () => {
    expect(isLiftedPassthroughKey(keydown('a', { ctrlKey: true }))).toBe(true);
    expect(isLiftedPassthroughKey(keydown('a', { metaKey: true }))).toBe(true);
    expect(isLiftedPassthroughKey(keydown('ArrowLeft', { altKey: true }))).toBe(true);
    expect(isLiftedPassthroughKey(keydown('F5'))).toBe(true);
    expect(isLiftedPassthroughKey(keydown('F12'))).toBe(true);
    expect(isLiftedPassthroughKey(keydown('Process', { isComposing: true }))).toBe(true);
  });

  it('holds back printable keys, Shift chords and navigation keys', () => {
    expect(isLiftedPassthroughKey(keydown('a'))).toBe(false);
    expect(isLiftedPassthroughKey(keydown('A', { shiftKey: true }))).toBe(false);
    expect(isLiftedPassthroughKey(keydown('PageDown'))).toBe(false);
    expect(isLiftedPassthroughKey(keydown('F'))).toBe(false);
  });
});

describe('consumeUnmappedLiftedKey', () => {
  it('keeps a held-back key from the collection and cancels its default', () => {
    expect(consumed(keydown('a'))).toEqual({ prevented: true, reachedChild: false });
  });

  it('keeps a passthrough key from the collection and leaves its default alone', () => {
    expect(consumed(keydown('a', { ctrlKey: true }))).toEqual({
      prevented: false,
      reachedChild: false,
    });
  });
});
