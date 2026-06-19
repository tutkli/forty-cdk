import { moveTreeNode, type MoveTreeNodeOptions } from './move-tree-node';
import type { ForTreeDragDropEvent } from './tree-drag-drop-event';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

function opts(event: ForTreeDragDropEvent): MoveTreeNodeOptions<Node> {
  return {
    event,
    trackBy: (n) => n.id,
    children: (n) => n.children,
    withChildren: (n, children) => ({ ...n, children: children as Node[] }),
  };
}

const ROOT_A: Node = {
  id: 'a',
  name: 'A',
  children: [
    { id: 'a1', name: 'A1' },
    { id: 'a2', name: 'A2', children: [{ id: 'a2x', name: 'A2X' }] },
  ],
};
const ROOT_B: Node = { id: 'b', name: 'B', children: [{ id: 'b1', name: 'B1' }] };
const ROOT_C: Node = { id: 'c', name: 'C' };

const ROOTS: Node[] = [ROOT_A, ROOT_B, ROOT_C];

function freeze(roots: Node[]): Node[] {
  const deepFreeze = (n: Node): Node => {
    Object.freeze(n);
    if (n.children) {
      n.children.forEach(deepFreeze);
      Object.freeze(n.children);
    }
    return n;
  };
  const frozen = roots.map(deepFreeze);
  Object.freeze(frozen);
  return frozen;
}

describe('moveTreeNode', () => {
  it('reorders siblings within the same parent', () => {
    const event: ForTreeDragDropEvent = {
      node: 'a1',
      previousParent: 'a',
      newParent: 'a',
      previousIndex: 0,
      currentIndex: 1,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    const aNode = result.find((n) => n.id === 'a')!;
    expect(aNode.children?.map((c) => c.id)).toEqual(['a2', 'a1']);
  });

  it('re-parents a node into another node', () => {
    const event: ForTreeDragDropEvent = {
      node: 'c',
      previousParent: null,
      newParent: 'b',
      previousIndex: 2,
      currentIndex: 1,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result.map((n) => n.id)).toEqual(['a', 'b']);
    const bNode = result.find((n) => n.id === 'b')!;
    expect(bNode.children?.map((c) => c.id)).toEqual(['b1', 'c']);
  });

  it('re-parents a node out to the root level', () => {
    const event: ForTreeDragDropEvent = {
      node: 'a1',
      previousParent: 'a',
      newParent: null,
      previousIndex: 0,
      currentIndex: 1,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result.map((n) => n.id)).toEqual(['a', 'a1', 'b', 'c']);
    const aNode = result.find((n) => n.id === 'a')!;
    expect(aNode.children?.map((c) => c.id)).toEqual(['a2']);
  });

  it('returns roots unchanged when moving a node into its own descendant', () => {
    const event: ForTreeDragDropEvent = {
      node: 'a',
      previousParent: null,
      newParent: 'a1',
      previousIndex: 0,
      currentIndex: 0,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns roots unchanged when node is not found', () => {
    const event: ForTreeDragDropEvent = {
      node: 'nonexistent',
      previousParent: null,
      newParent: null,
      previousIndex: 0,
      currentIndex: 0,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns roots unchanged when moving a node into itself', () => {
    const event: ForTreeDragDropEvent = {
      node: 'a',
      previousParent: null,
      newParent: 'a',
      previousIndex: 0,
      currentIndex: 0,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('preserves subtree when re-parenting a node with children', () => {
    const event: ForTreeDragDropEvent = {
      node: 'a2',
      previousParent: 'a',
      newParent: 'b',
      previousIndex: 1,
      currentIndex: 0,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    const bNode = result.find((n) => n.id === 'b')!;
    expect(bNode.children?.[0]?.id).toBe('a2');
    expect(bNode.children?.[0]?.children?.[0]?.id).toBe('a2x');
  });

  it('does not mutate the original roots array', () => {
    const frozen = freeze(
      ROOTS.map((n) => ({ ...n, children: n.children ? [...n.children] : undefined })),
    );
    const event: ForTreeDragDropEvent = {
      node: 'c',
      previousParent: null,
      newParent: 'b',
      previousIndex: 2,
      currentIndex: 0,
    };
    expect(() => moveTreeNode(frozen, opts(event))).not.toThrow();
    expect(frozen.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate original nodes during deep re-parent', () => {
    const originalA = { ...ROOT_A, children: ROOT_A.children ? [...ROOT_A.children] : undefined };
    Object.freeze(originalA);
    const roots: Node[] = [originalA, { ...ROOT_B }, ROOT_C];
    const event: ForTreeDragDropEvent = {
      node: 'a1',
      previousParent: 'a',
      newParent: 'b',
      previousIndex: 0,
      currentIndex: 0,
    };
    const result = moveTreeNode(roots, opts(event));
    expect(result.find((n) => n.id === 'a')?.children?.map((c) => c.id)).toEqual(['a2']);
    expect(result.find((n) => n.id === 'b')?.children?.map((c) => c.id)).toEqual(['a1', 'b1']);
  });

  it('clamps currentIndex to valid range when inserting at root', () => {
    const event: ForTreeDragDropEvent = {
      node: 'a1',
      previousParent: 'a',
      newParent: null,
      previousIndex: 0,
      currentIndex: 999,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result[result.length - 1]?.id).toBe('a1');
  });

  it('handles move to index 0 (prepend)', () => {
    const event: ForTreeDragDropEvent = {
      node: 'c',
      previousParent: null,
      newParent: null,
      previousIndex: 2,
      currentIndex: 0,
    };
    const result = moveTreeNode(ROOTS, opts(event));
    expect(result.map((n) => n.id)).toEqual(['c', 'a', 'b']);
  });
});
