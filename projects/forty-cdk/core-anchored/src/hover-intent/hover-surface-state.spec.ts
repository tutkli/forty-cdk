import { createHoverSurfaceState, type HoverSurfaceState } from './hover-surface-state';

function setup(): {
  state: HoverSurfaceState;
  close: ReturnType<typeof vi.fn>;
  setTrigger: (el: HTMLElement | null) => void;
} {
  const close = vi.fn();
  let trigger: HTMLElement | null = document.createElement('button');
  const state = createHoverSurfaceState({
    trigger: () => trigger,
    content: () => null,
    side: () => 'bottom',
    close,
  });
  return {
    state,
    close,
    setTrigger: (el) => {
      trigger = el;
    },
  };
}

describe('createHoverSurfaceState', () => {
  it('closes once the last keep-alive source drops', () => {
    const { state, close } = setup();
    state.enterTrigger();
    state.focusContent();

    state.leaveTrigger();
    state.closeIfInactive();
    expect(close).not.toHaveBeenCalled();

    state.blurContent();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the surface alive while the registered trigger is hovered', () => {
    const { state, close } = setup();
    state.enterTrigger();

    state.closeIfInactive();

    expect(close).not.toHaveBeenCalled();
  });

  it('forgets a hovered and focused trigger once it unmounts', () => {
    const { state, close, setTrigger } = setup();
    state.enterTrigger();
    state.focusTrigger();

    setTrigger(null);

    expect(state.triggerFocused()).toBe(false);
    state.closeIfInactive();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('forgets a hovered and focused trigger once another element is the registered one', () => {
    const { state, close, setTrigger } = setup();
    state.enterTrigger();
    state.focusTrigger();

    setTrigger(document.createElement('button'));

    expect(state.focused()).toBe(false);
    state.closeIfInactive();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('forgets a hovered and focused content once it unmounts', () => {
    const { state, close } = setup();
    state.enterContent();
    state.focusContent();

    state.resetContent();

    expect(state.focused()).toBe(false);
    state.closeIfInactive();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps a focused trigger alive across a content reset', () => {
    const { state, close } = setup();
    state.focusTrigger();

    state.resetContent();
    state.closeIfInactive();

    expect(close).not.toHaveBeenCalled();
  });

  it('closes at once when a grace is armed with no content registered', () => {
    const { state, close } = setup();

    state.armGrace({ x: 0, y: 0 });

    expect(close).toHaveBeenCalledTimes(1);
  });
});
