import { arbitrateLiftPress } from './lift-arbitration';

describe('arbitrateLiftPress', () => {
  const lifted = document.createElement('li');
  const other = document.createElement('li');

  function arbitrate(keyboardLifted: boolean, pressedHost: HTMLElement | null) {
    const cancelKeyboardLift = vi.fn();
    const free = arbitrateLiftPress({
      keyboardLifted,
      liftedHost: keyboardLifted ? lifted : null,
      pressedHost,
      cancelKeyboardLift,
    });
    return { free, cancelled: cancelKeyboardLift.mock.calls.length };
  }

  it('frees any press while no keyboard lift is live', () => {
    expect(arbitrate(false, other)).toEqual({ free: true, cancelled: 0 });
    expect(arbitrate(false, null)).toEqual({ free: true, cancelled: 0 });
  });

  it('cancels the keyboard lift once and frees a press on another item', () => {
    expect(arbitrate(true, other)).toEqual({ free: true, cancelled: 1 });
  });

  it('refuses a press on the lifted item and keeps the lift', () => {
    expect(arbitrate(true, lifted)).toEqual({ free: false, cancelled: 0 });
  });

  it('refuses a press on no item and keeps the lift', () => {
    expect(arbitrate(true, null)).toEqual({ free: false, cancelled: 0 });
  });
});
