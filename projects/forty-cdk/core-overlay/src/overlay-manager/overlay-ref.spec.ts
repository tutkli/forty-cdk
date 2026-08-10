import { OverlayRef } from './overlay-ref';

describe('OverlayRef', () => {
  it('starts open: isClosed is false and result is undefined', () => {
    const ref = new OverlayRef(() => undefined, 'programmatic');
    expect(ref.isClosed()).toBe(false);
    expect(ref.result()).toBeUndefined();
  });

  it('flips isClosed and records the result on close()', () => {
    const ref = new OverlayRef<string>(() => undefined, 'programmatic');
    ref.close('done');
    expect(ref.isClosed()).toBe(true);
    expect(ref.result()).toBe('done');
  });

  it('runs the teardown exactly once on the first close()', () => {
    const teardown = vi.fn();
    const ref = new OverlayRef(teardown, 'programmatic');
    ref.close();
    ref.close();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a second close() does not overwrite the result', () => {
    const ref = new OverlayRef<string>(() => undefined, 'programmatic');
    ref.close('first');
    ref.close('second');
    expect(ref.result()).toBe('first');
  });

  it('resolves the closed promise with { reason, result }', async () => {
    const ref = new OverlayRef<number>(() => undefined, 'programmatic');
    ref.close(42);
    await expect(ref.closed).resolves.toEqual({ reason: 'programmatic', result: 42 });
  });

  it('resolves the closed promise with the first { reason, result } when closed twice', async () => {
    const ref = new OverlayRef<number>(() => undefined, 'programmatic');
    ref.close(1);
    ref.close(2);
    await expect(ref.closed).resolves.toEqual({ reason: 'programmatic', result: 1 });
  });

  it('falls back to the default reason and an undefined result when closed without arguments', async () => {
    const ref = new OverlayRef(() => undefined, 'programmatic');
    ref.close();
    await expect(ref.closed).resolves.toEqual({ reason: 'programmatic', result: undefined });
  });

  it('carries the explicit close reason when one is passed', async () => {
    const ref = new OverlayRef<string, 'escape' | 'programmatic'>(() => undefined, 'programmatic');
    ref.close('bye', 'escape');
    await expect(ref.closed).resolves.toEqual({ reason: 'escape', result: 'bye' });
  });
});
