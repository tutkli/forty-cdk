import { CloseReasonState } from './close-reason-state';

describe('CloseReasonState', () => {
  it('starts at null', () => {
    const state = new CloseReasonState<'escape' | 'tab'>();
    expect(state.reason()).toBeNull();
  });

  it('records the most recent reason via set', () => {
    const state = new CloseReasonState<'escape' | 'tab'>();
    state.set('escape');
    expect(state.reason()).toBe('escape');
    state.set('tab');
    expect(state.reason()).toBe('tab');
  });

  it('reset clears the reason back to null', () => {
    const state = new CloseReasonState<'escape' | 'tab'>();
    state.set('escape');
    state.reset();
    expect(state.reason()).toBeNull();
  });
});
