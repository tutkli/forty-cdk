import { createSingleSlot } from './single-slot';

interface Occupant {
  readonly name: string;
}

function makeSlot() {
  return createSingleSlot<Occupant>({
    primitive: 'search',
    owner: '[forSearchGroup]',
    claimant: '[forSearch]',
  });
}

describe('createSingleSlot', () => {
  const a: Occupant = { name: 'a' };
  const b: Occupant = { name: 'b' };
  const c: Occupant = { name: 'c' };

  it('reports null while the slot is empty', () => {
    expect(makeSlot().value()).toBeNull();
  });

  it('exposes the registered occupant', () => {
    const slot = makeSlot();
    slot.register(a);
    expect(slot.value()).toBe(a);
  });

  it('coordinates the most recently registered occupant', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeSlot();
    slot.register(a);
    slot.register(b);
    expect(slot.value()).toBe(b);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('restores the surviving occupant when the newest unregisters', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeSlot();
    slot.register(a);
    slot.register(b);
    slot.unregister(b);
    expect(slot.value()).toBe(a);
  });

  it('empties the slot only when the last occupant unregisters', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeSlot();
    slot.register(a);
    slot.register(b);
    slot.unregister(b);
    expect(slot.value()).toBe(a);
    slot.unregister(a);
    expect(slot.value()).toBeNull();
  });

  it('ignores an unregister from an occupant that never registered', () => {
    const slot = makeSlot();
    slot.register(a);
    slot.unregister(c);
    expect(slot.value()).toBe(a);
  });

  it('does not let a stale unregister clobber a newer registration', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeSlot();
    slot.register(a);
    slot.register(b);
    slot.unregister(a);
    expect(slot.value()).toBe(b);
  });

  it('warns in dev mode when a second occupant registers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeSlot();
    slot.register(a);
    slot.register(b);

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain('[forty-cdk/search]');
    expect(message).toContain('[forSearchGroup]');
    expect(message).toContain('[forSearch]');
    expect(message).toContain('but 2 are registered');
  });

  it('does not warn for the first registration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    makeSlot().register(a);
    expect(warn).not.toHaveBeenCalled();
  });
});
