import { FOR_DRAG_DROP_FALLBACK_DEFAULTS } from './drag-drop-defaults';

function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ...init });
}

describe('FOR_DRAG_DROP_FALLBACK_DEFAULTS.liftKey', () => {
  const { liftKey } = FOR_DRAG_DROP_FALLBACK_DEFAULTS;

  it('accepts Shift+Enter, the binding no operating system reserves', () => {
    expect(liftKey(keydown('Enter', { shiftKey: true }))).toBe(true);
  });

  it('accepts Ctrl+Space and Cmd+Space where the page receives them', () => {
    expect(liftKey(keydown(' ', { ctrlKey: true }))).toBe(true);
    expect(liftKey(keydown(' ', { metaKey: true }))).toBe(true);
  });

  it('rejects the plain activation keys the collections own', () => {
    expect(liftKey(keydown('Enter'))).toBe(false);
    expect(liftKey(keydown(' '))).toBe(false);
    expect(liftKey(keydown(' ', { shiftKey: true }))).toBe(false);
  });

  it('rejects Shift+Enter combined with another modifier', () => {
    expect(liftKey(keydown('Enter', { shiftKey: true, ctrlKey: true }))).toBe(false);
    expect(liftKey(keydown('Enter', { shiftKey: true, metaKey: true }))).toBe(false);
    expect(liftKey(keydown('Enter', { shiftKey: true, altKey: true }))).toBe(false);
  });
});
