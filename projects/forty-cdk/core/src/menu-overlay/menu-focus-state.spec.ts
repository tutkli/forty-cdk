import { CloseReasonState, InitialFocusState } from './menu-focus-state';

describe('InitialFocusState', () => {
  it('defaults the target to "first"', () => {
    const state = new InitialFocusState();
    expect(state.target()).toBe('first');
  });

  it('setTarget updates the target signal', () => {
    const state = new InitialFocusState();
    state.setTarget('last');
    expect(state.target()).toBe('last');
  });

  it('prepareOpen records the target', () => {
    const state = new InitialFocusState();
    state.prepareOpen('last', true);
    expect(state.target()).toBe('last');
    state.prepareOpen('first', false);
    expect(state.target()).toBe('first');
  });

  it('consumeHighlight defaults to true and re-arms after one read', () => {
    const state = new InitialFocusState();
    expect(state.consumeHighlight()).toBe(true);
    expect(state.consumeHighlight()).toBe(true);
  });

  it('suppresses the highlight for exactly one consume after a pointer-style open', () => {
    const state = new InitialFocusState();
    state.prepareOpen('first', false);
    expect(state.consumeHighlight()).toBe(false);
    // One-shot: the next consume highlights normally.
    expect(state.consumeHighlight()).toBe(true);
  });

  it('keeps highlighting after a keyboard-style open', () => {
    const state = new InitialFocusState();
    state.prepareOpen('first', true);
    expect(state.consumeHighlight()).toBe(true);
  });
});

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
