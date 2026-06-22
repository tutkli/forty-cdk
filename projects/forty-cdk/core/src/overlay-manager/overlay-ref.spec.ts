import { OverlayRef } from './overlay-ref';

describe('OverlayRef', () => {
  it('starts open: isClosed is false and result is undefined', () => {
    const ref = new OverlayRef(() => undefined);
    expect(ref.isClosed()).toBe(false);
    expect(ref.result()).toBeUndefined();
  });

  it('flips isClosed and records the result on close()', () => {
    const ref = new OverlayRef<string>(() => undefined);
    ref.close('done');
    expect(ref.isClosed()).toBe(true);
    expect(ref.result()).toBe('done');
  });

  it('runs the teardown exactly once on the first close()', () => {
    const teardown = vi.fn();
    const ref = new OverlayRef(teardown);
    ref.close();
    ref.close();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a second close() does not overwrite the result', () => {
    const ref = new OverlayRef<string>(() => undefined);
    ref.close('first');
    ref.close('second');
    expect(ref.result()).toBe('first');
  });

  it('resolves the closed promise with the result', async () => {
    const ref = new OverlayRef<number>(() => undefined);
    ref.close(42);
    await expect(ref.closed).resolves.toBe(42);
  });

  it('resolves the closed promise with the first result when closed twice', async () => {
    const ref = new OverlayRef<number>(() => undefined);
    ref.close(1);
    ref.close(2);
    await expect(ref.closed).resolves.toBe(1);
  });

  it('resolves the closed promise with undefined when closed without a result', async () => {
    const ref = new OverlayRef(() => undefined);
    ref.close();
    await expect(ref.closed).resolves.toBeUndefined();
  });
});
