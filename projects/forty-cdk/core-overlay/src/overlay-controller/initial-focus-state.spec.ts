import { InitialFocusState } from './initial-focus-state';

describe('InitialFocusState', () => {
  it('defaults the target to "first"', () => {
    const state = new InitialFocusState();
    expect(state.target()).toBe('first');
  });

  it('accepts an explicit default target for a widened focus union', () => {
    const state = new InitialFocusState<'first' | 'last' | 'selected'>('selected');
    expect(state.target()).toBe('selected');
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
