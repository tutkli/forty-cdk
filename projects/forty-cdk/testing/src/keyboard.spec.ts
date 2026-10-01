import { pressKey } from './keyboard';

describe('pressKey', () => {
  let parent: HTMLElement;
  let target: HTMLElement;

  beforeEach(() => {
    parent = document.createElement('div');
    target = document.createElement('button');
    parent.append(target);
    document.body.append(parent);
  });

  afterEach(() => parent.remove());

  it('dispatches a keydown for the key that bubbles to an ancestor', () => {
    const seen: KeyboardEvent[] = [];
    parent.addEventListener('keydown', (event) => seen.push(event));

    const event = pressKey(target, 'ArrowDown');

    expect(seen).toEqual([event]);
    expect(event.type).toBe('keydown');
    expect(event.key).toBe('ArrowDown');
    expect(event.target).toBe(target);
  });

  it("reports a handler's preventDefault through defaultPrevented", () => {
    target.addEventListener('keydown', (event) => event.preventDefault());

    expect(pressKey(target, 'Enter').defaultPrevented).toBe(true);
  });

  it('leaves defaultPrevented false when no handler claims the key', () => {
    expect(pressKey(target, 'Enter').defaultPrevented).toBe(false);
  });

  it('dispatches a keyup and passes the remaining init members through', () => {
    const event = pressKey(target, 'Tab', { type: 'keyup', shiftKey: true, code: 'Tab' });

    expect(event.type).toBe('keyup');
    expect(event.shiftKey).toBe(true);
    expect(event.code).toBe('Tab');
  });

  it('lets a caller opt out of bubbling and cancelability', () => {
    const seen: KeyboardEvent[] = [];
    parent.addEventListener('keydown', (event) => seen.push(event));
    target.addEventListener('keydown', (event) => event.preventDefault());

    const event = pressKey(target, 'Escape', { bubbles: false, cancelable: false });

    expect(seen).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });
});
