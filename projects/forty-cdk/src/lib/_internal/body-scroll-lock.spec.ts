import {
  _resetBodyScrollLockForTesting,
  lockBodyScroll,
  unlockBodyScroll,
} from './body-scroll-lock';

describe('body-scroll-lock', () => {
  beforeEach(() => {
    _resetBodyScrollLockForTesting();
  });

  afterEach(() => {
    _resetBodyScrollLockForTesting();
  });

  it('sets overflow:hidden on the first lock', () => {
    expect(document.body.style.overflow).toBe('');
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores overflow on the last unlock', () => {
    document.body.style.overflow = 'auto';
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('refcounts: nested locks only restore on final unlock', () => {
    document.body.style.overflow = 'scroll';
    lockBodyScroll();
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('extra unlock calls are no-ops', () => {
    expect(() => unlockBodyScroll()).not.toThrow();
    expect(() => unlockBodyScroll()).not.toThrow();
    expect(document.body.style.overflow).toBe('');
  });

  it('restores empty padding-right when none was set', () => {
    lockBodyScroll();
    unlockBodyScroll();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('preserves a pre-existing padding-right inline style on unlock', () => {
    document.body.style.paddingRight = '24px';
    lockBodyScroll();
    unlockBodyScroll();
    expect(document.body.style.paddingRight).toBe('24px');
  });
});
