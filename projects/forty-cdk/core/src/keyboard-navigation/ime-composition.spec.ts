import { isImeComposing } from './ime-composition';

describe('isImeComposing', () => {
  it('is true for a keydown dispatched while a composition is in progress', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true }))).toBe(
      true,
    );
  });

  it('is true for the keyCode 229 keydown that ends a composition', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229 }))).toBe(
      true,
    );
  });

  it('is false for a plain keydown', () => {
    expect(isImeComposing(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }))).toBe(
      false,
    );
  });
});
