import { isHoverCapablePointer } from './hover-capable-pointer';

describe('isHoverCapablePointer', () => {
  it('reports a mouse pointer as hover-capable', () => {
    expect(isHoverCapablePointer({ pointerType: 'mouse' })).toBe(true);
  });

  it('reports the empty synthetic pointerType as hover-capable', () => {
    expect(isHoverCapablePointer({ pointerType: '' })).toBe(true);
  });

  it('reports touch as not hover-capable', () => {
    expect(isHoverCapablePointer({ pointerType: 'touch' })).toBe(false);
  });

  it('reports pen as not hover-capable', () => {
    expect(isHoverCapablePointer({ pointerType: 'pen' })).toBe(false);
  });
});
