import { pointerEvent, pressWithMouse } from './pointer';

describe('pointerEvent', () => {
  it('builds a bubbling, cancelable PointerEvent with pointerId 1 and spec defaults', () => {
    const event = pointerEvent('pointerdown');

    expect(event).toBeInstanceOf(PointerEvent);
    expect(event.type).toBe('pointerdown');
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.pointerId).toBe(1);
    expect(event.buttons).toBe(0);
    expect(event.isPrimary).toBe(false);
    expect(event.pointerType).toBe('');
  });

  it('applies the init members it is given over the defaults', () => {
    const event = pointerEvent('pointermove', {
      clientX: 140,
      buttons: 1,
      pointerId: 7,
      pointerType: 'touch',
    });

    expect(event.clientX).toBe(140);
    expect(event.buttons).toBe(1);
    expect(event.pointerId).toBe(7);
    expect(event.pointerType).toBe('touch');
  });

  it('reaches a document listener when dispatched inside an open shadow root', () => {
    const host = document.createElement('div');
    const button = document.createElement('button');
    host.attachShadow({ mode: 'open' }).append(button);
    document.body.append(host);
    const seen = vi.fn();
    document.addEventListener('pointerdown', seen);

    try {
      const event = pointerEvent('pointerdown');
      button.dispatchEvent(event);

      expect(seen).toHaveBeenCalledExactlyOnceWith(event);
    } finally {
      document.removeEventListener('pointerdown', seen);
      host.remove();
    }
  });

  it('lets a caller opt out of composition', () => {
    expect(pointerEvent('pointerdown', { composed: false }).composed).toBe(false);
  });
});

describe('pressWithMouse', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });

  afterEach(() => root.remove());

  const SEQUENCE = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];

  function record(target: EventTarget): Event[] {
    const seen: Event[] = [];
    for (const type of SEQUENCE) {
      target.addEventListener(type, (event) => seen.push(event));
    }
    return seen;
  }

  it('dispatches the full press sequence, in browser order, all bubbling', () => {
    const button = document.createElement('button');
    root.append(button);
    const seen = record(root);

    pressWithMouse(button);

    expect(seen.map((event) => event.type)).toEqual(SEQUENCE);
  });

  it('presses with the primary mouse button', () => {
    const button = document.createElement('button');
    root.append(button);
    const seen = record(root);

    pressWithMouse(button);

    const [down, , up] = seen as [PointerEvent, MouseEvent, PointerEvent];
    expect(down.pointerType).toBe('mouse');
    expect(down.isPrimary).toBe(true);
    expect(down.button).toBe(0);
    expect(down.buttons).toBe(1);
    expect(up.buttons).toBe(0);
  });

  it('focuses the nearest focusable ancestor of the pressed element', () => {
    const button = document.createElement('button');
    const label = document.createElement('span');
    button.append(label);
    root.append(button);

    pressWithMouse(label);

    expect(document.activeElement).toBe(button);
  });

  it('blurs the focused element when nothing under the press is focusable', () => {
    const input = document.createElement('input');
    const text = document.createElement('p');
    root.append(input, text);
    input.focus();

    pressWithMouse(text);

    expect(document.activeElement).toBe(document.body);
  });

  it('moves no focus when a mousedown listener prevents the default', () => {
    const input = document.createElement('input');
    const button = document.createElement('button');
    button.addEventListener('mousedown', (event) => event.preventDefault());
    root.append(input, button);
    input.focus();

    pressWithMouse(button);

    expect(document.activeElement).toBe(input);
  });

  it('delivers every event of the press to a document listener from inside an open shadow root', () => {
    const host = document.createElement('div');
    const button = document.createElement('button');
    host.attachShadow({ mode: 'open' }).append(button);
    root.append(host);
    const seen: string[] = [];
    const listener = (event: Event): void => {
      seen.push(event.type);
    };
    for (const type of SEQUENCE) {
      document.addEventListener(type, listener);
    }

    try {
      pressWithMouse(button);

      expect(seen).toEqual(SEQUENCE);
    } finally {
      for (const type of SEQUENCE) {
        document.removeEventListener(type, listener);
      }
    }
  });

  it('focuses an editable region rather than the focusable cell around it', () => {
    root.innerHTML = '<div tabindex="0"><div contenteditable="true">text</div></div>';
    const editable = root.querySelector<HTMLElement>('[contenteditable]')!;

    pressWithMouse(editable);

    expect(document.activeElement).toBe(editable);
  });

  it('focuses a pressed summary', () => {
    root.innerHTML = '<details><summary>More</summary>Body</details>';
    const summary = root.querySelector('summary')!;

    pressWithMouse(summary);

    expect(document.activeElement).toBe(summary);
  });

  it('focuses the focusable host of a non-focusable node pressed inside its shadow root', () => {
    const host = document.createElement('div');
    host.tabIndex = 0;
    const label = document.createElement('span');
    host.attachShadow({ mode: 'open' }).append(label);
    root.append(host);

    pressWithMouse(label);

    expect(document.activeElement).toBe(host);
  });

  it('skips the compatibility mouse events and the focus move when pointerdown is cancelled', () => {
    const input = document.createElement('input');
    const button = document.createElement('button');
    button.addEventListener('pointerdown', (event) => event.preventDefault());
    root.append(input, button);
    input.focus();
    const seen = record(root);

    pressWithMouse(button);

    expect(seen.map((event) => event.type)).toEqual(['pointerdown', 'pointerup', 'click']);
    expect(document.activeElement).toBe(input);
  });
});
