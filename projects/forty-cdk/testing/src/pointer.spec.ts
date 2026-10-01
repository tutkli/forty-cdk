import { pointerEvent, pressWithMouse } from './pointer';

describe('pointerEvent', () => {
  it('builds a bubbling, cancelable PointerEvent with pointerId 1 and spec defaults', () => {
    const event = pointerEvent('pointerdown');

    expect(event).toBeInstanceOf(PointerEvent);
    expect(event.type).toBe('pointerdown');
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
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
});
