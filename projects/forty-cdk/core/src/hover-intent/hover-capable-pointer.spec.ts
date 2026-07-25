import { isHoverCapablePointer, isNonTouchPointer } from './hover-capable-pointer';

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

describe('isNonTouchPointer', () => {
  it('reports a mouse pointer as hovering', () => {
    expect(isNonTouchPointer({ pointerType: 'mouse' })).toBe(true);
  });

  it('reports a pen pointer as hovering, unlike its mouse-only twin', () => {
    expect(isNonTouchPointer({ pointerType: 'pen' })).toBe(true);
    expect(isHoverCapablePointer({ pointerType: 'pen' })).toBe(false);
  });

  it('reports the empty synthetic pointerType as hovering', () => {
    expect(isNonTouchPointer({ pointerType: '' })).toBe(true);
  });

  it('reports an unknown pointer type as hovering', () => {
    expect(isNonTouchPointer({ pointerType: 'trackpad' })).toBe(true);
  });

  it('reports touch as not hovering', () => {
    expect(isNonTouchPointer({ pointerType: 'touch' })).toBe(false);
  });
});
