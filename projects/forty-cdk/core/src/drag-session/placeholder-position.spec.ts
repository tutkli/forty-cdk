import { fencePlaceholderIndex, placeholderInsertion } from './placeholder-position';

function makeDiv(): HTMLElement {
  return document.createElement('div');
}

function makeParent(...children: HTMLElement[]): HTMLElement {
  const parent = makeDiv();
  for (const child of children) {
    parent.appendChild(child);
  }
  return parent;
}

describe('placeholderInsertion', () => {
  it('index in the middle — parent is hosts parent, ref is hosts[index]', () => {
    const [a, b, c] = [makeDiv(), makeDiv(), makeDiv()];
    const container = makeParent(a, b, c);
    const result = placeholderInsertion([a, b, c], 1, container);
    expect(result.parent).toBe(container);
    expect(result.ref).toBe(b);
  });

  it('index 0 — ref is the first host', () => {
    const [a, b] = [makeDiv(), makeDiv()];
    const container = makeParent(a, b);
    const result = placeholderInsertion([a, b], 0, container);
    expect(result.parent).toBe(container);
    expect(result.ref).toBe(a);
  });

  it('index === hosts.length with a trailing sibling — ref is last hosts nextSibling', () => {
    const [a, b, sibling] = [makeDiv(), makeDiv(), makeDiv()];
    const container = makeParent(a, b, sibling);
    const result = placeholderInsertion([a, b], 2, container);
    expect(result.parent).toBe(container);
    expect(result.ref).toBe(sibling);
  });

  it('index === hosts.length when last host is final child — ref is null', () => {
    const [a, b] = [makeDiv(), makeDiv()];
    const container = makeParent(a, b);
    const result = placeholderInsertion([a, b], 2, container);
    expect(result.parent).toBe(container);
    expect(result.ref).toBeNull();
  });

  it('empty hosts — parent is container, ref is null', () => {
    const container = makeDiv();
    const result = placeholderInsertion([], 0, container);
    expect(result.parent).toBe(container);
    expect(result.ref).toBeNull();
  });

  it('host whose parentNode differs from container — parent follows the hosts parent', () => {
    const host = makeDiv();
    const altParent = makeParent(host);
    const container = makeDiv();
    const result = placeholderInsertion([host], 0, container);
    expect(result.parent).toBe(altParent);
    expect(result.ref).toBe(host);
  });
});

describe('fencePlaceholderIndex', () => {
  it('no disabled hosts — returns the index unchanged', () => {
    const disabled = [false, false, false, false];
    expect(fencePlaceholderIndex(0, disabled, 3)).toBe(0);
    expect(fencePlaceholderIndex(2, disabled, 3)).toBe(2);
    expect(fencePlaceholderIndex(4, disabled, 3)).toBe(4);
  });

  it('leading pinned block [F*, F*, A, C], origin after A — clamps the lower bound to 2', () => {
    const disabled = [true, true, false, false];
    expect(fencePlaceholderIndex(0, disabled, 3)).toBe(2);
    expect(fencePlaceholderIndex(1, disabled, 3)).toBe(2);
    expect(fencePlaceholderIndex(2, disabled, 3)).toBe(2);
    expect(fencePlaceholderIndex(3, disabled, 3)).toBe(3);
    expect(fencePlaceholderIndex(4, disabled, 3)).toBe(4);
  });

  it('trailing pinned block [A, C, F*], origin before A — clamps the upper bound to 2', () => {
    const disabled = [false, false, true];
    expect(fencePlaceholderIndex(0, disabled, 0)).toBe(0);
    expect(fencePlaceholderIndex(1, disabled, 0)).toBe(1);
    expect(fencePlaceholderIndex(2, disabled, 0)).toBe(2);
    expect(fencePlaceholderIndex(3, disabled, 0)).toBe(2);
  });

  it('pinned on both ends [F*, A, C, F2*], origin between A and C — clamps to band [1, 3]', () => {
    const disabled = [true, false, false, true];
    expect(fencePlaceholderIndex(0, disabled, 2)).toBe(1);
    expect(fencePlaceholderIndex(1, disabled, 2)).toBe(1);
    expect(fencePlaceholderIndex(2, disabled, 2)).toBe(2);
    expect(fencePlaceholderIndex(3, disabled, 2)).toBe(3);
    expect(fencePlaceholderIndex(4, disabled, 2)).toBe(3);
  });

  it('interspersed pinned item [A, F*, B] — fences each origin to its own enabled run', () => {
    const disabled = [false, true, false];
    expect(fencePlaceholderIndex(0, disabled, 0)).toBe(0);
    expect(fencePlaceholderIndex(1, disabled, 0)).toBe(1);
    expect(fencePlaceholderIndex(3, disabled, 0)).toBe(1);
    expect(fencePlaceholderIndex(0, disabled, 3)).toBe(2);
    expect(fencePlaceholderIndex(2, disabled, 3)).toBe(2);
    expect(fencePlaceholderIndex(3, disabled, 3)).toBe(3);
  });
});
