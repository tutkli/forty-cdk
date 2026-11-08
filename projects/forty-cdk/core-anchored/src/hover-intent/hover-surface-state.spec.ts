import { createHoverSurfaceState, type HoverSurfaceState } from './hover-surface-state';

function setup(): {
  state: HoverSurfaceState;
  close: ReturnType<typeof vi.fn>;
  trigger: () => HTMLElement | null;
  setTrigger: (el: HTMLElement | null) => void;
  setNested: (nested: boolean) => void;
} {
  const close = vi.fn();
  let trigger: HTMLElement | null = document.createElement('button');
  let nested = false;
  const state = createHoverSurfaceState({
    trigger: () => trigger,
    content: () => null,
    side: () => 'bottom',
    nested: () => nested,
    close,
  });
  return {
    state,
    close,
    trigger: () => trigger,
    setTrigger: (el) => {
      trigger = el;
    },
    setNested: (value) => {
      nested = value;
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

  it('keeps no reference to a hovered and focused trigger released on unmount', () => {
    const { state, close, trigger } = setup();
    state.enterTrigger();
    state.focusTrigger();

    state.releaseTrigger(trigger()!);

    expect(state.triggerFocused()).toBe(false);
    state.closeIfInactive();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the hover and focus of the trigger when another element is released', () => {
    const { state, close } = setup();
    state.enterTrigger();
    state.focusTrigger();

    state.releaseTrigger(document.createElement('button'));

    expect(state.triggerFocused()).toBe(true);
    state.closeIfInactive();
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the surface alive while a surface opened from the content is open', () => {
    const { state, close, setNested } = setup();
    state.enterContent();
    state.focusContent();
    setNested(true);

    state.leaveContent();
    state.blurContent();

    expect(close).not.toHaveBeenCalled();
  });

  it('closes once the task settles after the last nested surface closes', async () => {
    const { state, close, setNested } = setup();
    setNested(true);
    state.closeIfInactive();

    setNested(false);
    state.nestedSurfaceClosed();
    expect(close).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('stays open when focus returns into the content before the nested close settles', async () => {
    const { state, close } = setup();

    state.nestedSurfaceClosed();
    state.focusContent();

    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
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
