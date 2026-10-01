import { withFlippableReducedMotion, withReducedMotion } from './reduced-motion';

const REDUCE = '(prefers-reduced-motion: reduce)';

describe('withReducedMotion', () => {
  it('starts from an environment with no usable matchMedia', () => {
    expect(globalThis.matchMedia).toBeUndefined();
  });

  it('matches the reduce query and nothing else, until restored', () => {
    const restore = withReducedMotion();

    try {
      expect(matchMedia(REDUCE).matches).toBe(true);
      expect(matchMedia(REDUCE).media).toBe(REDUCE);
      expect(matchMedia('(min-width: 640px)').matches).toBe(false);
      expect(matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(false);
    } finally {
      restore();
    }

    expect(globalThis.matchMedia).toBeUndefined();
  });

  it('puts back a matchMedia that was already there', () => {
    const original = vi.fn();
    vi.stubGlobal('matchMedia', original);

    withReducedMotion()();

    expect(globalThis.matchMedia).toBe(original);
  });
});

describe('withFlippableReducedMotion', () => {
  it('starts reduced by default, or at the preference it is given', () => {
    const reduced = withFlippableReducedMotion();
    expect(matchMedia(REDUCE).matches).toBe(true);
    reduced.restore();

    const motion = withFlippableReducedMotion(false);
    expect(matchMedia(REDUCE).matches).toBe(false);
    motion.restore();

    expect(globalThis.matchMedia).toBeUndefined();
  });

  it('notifies the change listeners registered on the query when the preference flips', () => {
    const motion = withFlippableReducedMotion(true);
    const listener = vi.fn();

    try {
      const query = matchMedia(REDUCE);
      query.addEventListener('change', listener);

      motion.set(false);

      expect(listener).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ matches: false }));
      expect(query.matches).toBe(false);
      expect(matchMedia(REDUCE).matches).toBe(false);

      query.removeEventListener('change', listener);
      motion.set(true);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      motion.restore();
    }
  });

  it('never matches a query other than the reduce one', () => {
    const motion = withFlippableReducedMotion(true);

    try {
      expect(matchMedia('(min-width: 640px)').matches).toBe(false);
    } finally {
      motion.restore();
    }
  });
});
