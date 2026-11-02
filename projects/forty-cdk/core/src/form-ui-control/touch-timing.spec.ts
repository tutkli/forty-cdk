import { dismissMarksTouched, leavesControl } from './touch-timing';

function focusOut(relatedTarget: EventTarget | null): FocusEvent {
  return new FocusEvent('focusout', { relatedTarget });
}

describe('leavesControl', () => {
  let root: HTMLElement;
  let inside: HTMLElement;
  let surface: HTMLElement;
  let outside: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    inside = document.createElement('button');
    root.appendChild(inside);
    surface = document.createElement('div');
    outside = document.createElement('button');
    document.body.append(root, surface, outside);
  });

  afterEach(() => {
    root.remove();
    surface.remove();
    outside.remove();
  });

  it('leaves when focus leaves the document', () => {
    expect(leavesControl(focusOut(null), [root])).toBe(true);
  });

  it('stays when focus moves to a descendant of any boundary', () => {
    expect(leavesControl(focusOut(inside), [root])).toBe(false);
    expect(leavesControl(focusOut(surface), [root, surface])).toBe(false);
  });

  it('leaves when focus moves outside every boundary', () => {
    expect(leavesControl(focusOut(outside), [root, surface])).toBe(true);
  });

  it('skips a boundary that has not mounted yet', () => {
    expect(leavesControl(focusOut(inside), [null, undefined, root])).toBe(false);
    expect(leavesControl(focusOut(outside), [null, undefined])).toBe(true);
  });
});

describe('dismissMarksTouched', () => {
  it('counts an outside interaction as touch', () => {
    expect(dismissMarksTouched('pointerDownOutside')).toBe(true);
    expect(dismissMarksTouched('focusOutside')).toBe(true);
  });

  it('does not count Escape as touch', () => {
    expect(dismissMarksTouched('escape')).toBe(false);
  });
});
