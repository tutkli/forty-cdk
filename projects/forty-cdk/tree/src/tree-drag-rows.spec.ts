import type { ForTreeItemHandle, ForTreeVisibleNode } from './tree-context';
import { isInsideGrabArea, resolveTreeLiftContext } from './tree-drag-rows';

function entry(
  value: string,
  host: HTMLElement,
  parentHost: HTMLElement | null,
): ForTreeVisibleNode<string> {
  return { handle: { host } as ForTreeItemHandle<string>, value, parentHost };
}

function treeItem(...children: Node[]): HTMLElement {
  const li = document.createElement('li');
  li.setAttribute('role', 'treeitem');
  li.append(...children);
  return li;
}

function group(...items: HTMLElement[]): HTMLElement {
  const ul = document.createElement('ul');
  ul.setAttribute('role', 'group');
  ul.append(...items);
  return ul;
}

describe('resolveTreeLiftContext', () => {
  it('captures the parent value and the sibling index of a nested node', () => {
    const a = document.createElement('li');
    const a1 = document.createElement('li');
    const a2 = document.createElement('li');
    const b = document.createElement('li');
    const visible = [
      entry('a', a, null),
      entry('a1', a1, a),
      entry('a2', a2, a),
      entry('b', b, null),
    ];

    expect(resolveTreeLiftContext(visible, 2)).toEqual({
      value: 'a2',
      parentValue: 'a',
      previousIndex: 1,
    });
    expect(resolveTreeLiftContext(visible, 3)).toEqual({
      value: 'b',
      parentValue: null,
      previousIndex: 1,
    });
  });

  it('reads the visible list a bounded number of times for the last of a long sibling run', () => {
    let reads = 0;
    const entries = Array.from({ length: 2000 }, (_, i) =>
      entry(`n${i}`, document.createElement('li'), null),
    );
    const visible = new Proxy(entries, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) {
          reads += 1;
        }
        return Reflect.get(target, key, receiver);
      },
    });

    const origin = resolveTreeLiftContext(visible, entries.length - 1);

    expect(origin!.previousIndex).toBe(entries.length - 1);
    expect(reads).toBeLessThan(4 * entries.length);
  });
});

describe('isInsideGrabArea', () => {
  it('keeps a handle-less parent grabbable anywhere while an expanded child carries a handle', () => {
    const parentLabel = document.createElement('div');
    const childHandle = document.createElement('span');
    const child = treeItem(childHandle, document.createElement('div'));
    const parent = treeItem(parentLabel, group(child));

    expect(isInsideGrabArea(parent, parentLabel, new Set([childHandle]))).toBe(true);
  });

  it('constrains an item with its own handle to that handle', () => {
    const childLabel = document.createElement('div');
    const childHandle = document.createElement('span');
    const child = treeItem(childHandle, childLabel);
    treeItem(document.createElement('div'), group(child));

    expect(isInsideGrabArea(child, childLabel, new Set([childHandle]))).toBe(false);
    expect(isInsideGrabArea(child, childHandle, new Set([childHandle]))).toBe(true);
  });

  it("constrains a parent to its own handle, not to an expanded child's", () => {
    const parentHandle = document.createElement('span');
    const parentLabel = document.createElement('div');
    parentLabel.append(parentHandle);
    const childHandle = document.createElement('span');
    const parent = treeItem(parentLabel, group(treeItem(childHandle)));
    const handles = new Set([parentHandle, childHandle]);

    expect(isInsideGrabArea(parent, parentLabel, handles)).toBe(false);
    expect(isInsideGrabArea(parent, parentHandle, handles)).toBe(true);
  });
});
