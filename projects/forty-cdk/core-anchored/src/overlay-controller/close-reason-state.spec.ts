import { signal } from '@angular/core';

import { CloseReasonState } from './close-reason-state';

type Reason = 'escape' | 'tab';

function setup(): { open: ReturnType<typeof signal<boolean>>; state: CloseReasonState<Reason> } {
  const open = signal(false);
  return { open, state: new CloseReasonState<Reason>(open) };
}

describe('CloseReasonState', () => {
  it('starts at null', () => {
    const { state } = setup();
    expect(state.reason()).toBeNull();
  });

  it('records the reason of a close', () => {
    const { open, state } = setup();
    open.set(true);
    state.close('escape', () => open.set(false));
    expect(state.reason()).toBe('escape');
  });

  it('exposes the reason to code running inside the close', () => {
    const { open, state } = setup();
    open.set(true);
    let seen: Reason | null = null;
    state.close('tab', () => {
      open.set(false);
      seen = state.reason();
    });
    expect(seen).toBe('tab');
  });

  it('clears the reason when the open source turns true', () => {
    const { open, state } = setup();
    open.set(true);
    state.close('tab', () => open.set(false));

    open.set(true);

    expect(state.reason()).toBeNull();
  });

  it('keeps the reason cleared through a close it did not record', () => {
    const { open, state } = setup();
    open.set(true);
    state.close('tab', () => open.set(false));
    open.set(true);
    expect(state.reason()).toBeNull();

    open.set(false);

    expect(state.reason()).toBeNull();
  });

  it('clears the reason for an open nothing read during', () => {
    const { open, state } = setup();
    open.set(true);
    state.close('tab', () => open.set(false));

    open.set(true);
    open.set(false);

    expect(state.reason()).toBeNull();
  });

  it('records the reason of the latest close over an earlier one', () => {
    const { open, state } = setup();
    open.set(true);
    state.close('tab', () => open.set(false));
    open.set(true);
    state.close('escape', () => open.set(false));
    expect(state.reason()).toBe('escape');
  });
});
