import { levelFromPointerX, resolveTreeDrop, type TreeDropRow } from './tree-drop-resolver';

function row(value: string, level: number, top: number, left = level * 16): TreeDropRow {
  return { value, level, left, top, bottom: top + 32 };
}

describe('resolveTreeDrop', () => {
  it('returns root index 0 for empty rows', () => {
    const result = resolveTreeDrop([], 0, 1);
    expect(result).toEqual({ parentValue: null, index: 0, level: 1 });
  });

  it('drops between two same-level siblings (reorder)', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32), row('c', 1, 64)];
    const result = resolveTreeDrop(rows, 1, 1);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('drops after the last row at root level', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32)];
    const result = resolveTreeDrop(rows, 2, 1);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(2);
  });

  it('drops at gap 0 (before all rows)', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32)];
    const result = resolveTreeDrop(rows, 0, 1);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(0);
  });

  it('re-parents into a parent at child depth', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('sibling', 1, 32)];
    const result = resolveTreeDrop(rows, 1, 2);
    expect(result.parentValue).toBe('parent');
    expect(result.level).toBe(2);
    expect(result.index).toBe(0);
  });

  it('drops just after a parent with a child depth (re-parent in)', () => {
    const rows: TreeDropRow[] = [
      row('parent', 1, 0),
      row('existing-child', 2, 32),
      row('sibling', 1, 64),
    ];
    const result = resolveTreeDrop(rows, 2, 2);
    expect(result.parentValue).toBe('parent');
    expect(result.level).toBe(2);
    expect(result.index).toBe(1);
  });

  it('allows out-denting to root at the end gap below a deep node', () => {
    const rows: TreeDropRow[] = [
      row('parent', 1, 0),
      row('child', 2, 32),
      row('grandchild', 3, 64),
    ];
    const result = resolveTreeDrop(rows, 3, 1);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('clamps up to the following row level (cannot be shallower than next)', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('child', 2, 32)];
    const result = resolveTreeDrop(rows, 1, 1);
    expect(result.parentValue).toBe('parent');
    expect(result.level).toBe(2);
    expect(result.index).toBe(0);
  });

  it('clamps to maxLevel when desired level is too deep', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32)];
    const result = resolveTreeDrop(rows, 1, 5);
    expect(result.level).toBe(2);
  });

  it('resolves shallow level (out to root / shallower parent) when desired is 1', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('child', 2, 32), row('sibling', 1, 64)];
    const result = resolveTreeDrop(rows, 2, 1);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('correctly counts index among siblings under same parent', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('child1', 2, 32), row('child2', 2, 64)];
    const result = resolveTreeDrop(rows, 3, 2);
    expect(result.parentValue).toBe('parent');
    expect(result.level).toBe(2);
    expect(result.index).toBe(2);
  });

  it('handles nested multi-level tree drop', () => {
    const rows: TreeDropRow[] = [
      row('root1', 1, 0),
      row('child1', 2, 32),
      row('grandchild1', 3, 64),
      row('root2', 1, 96),
    ];
    const result = resolveTreeDrop(rows, 3, 2);
    expect(result.parentValue).toBe('root1');
    expect(result.level).toBe(2);
    expect(result.index).toBe(1);
  });

  it('handles single row case', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0)];
    const result = resolveTreeDrop(rows, 1, 1);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('minLevel = maxLevel when defensive clamp applies', () => {
    const rows: TreeDropRow[] = [row('a', 2, 0), row('b', 3, 32)];
    const result = resolveTreeDrop(rows, 1, 1);
    expect(result.level).toBeGreaterThanOrEqual(1);
    expect(result.level).toBeLessThanOrEqual(3);
  });
});

describe('levelFromPointerX', () => {
  it('returns 1 for empty rows', () => {
    expect(levelFromPointerX([], 0, 0)).toBe(1);
  });

  it('returns minLevel when minLevel === maxLevel', () => {
    const rows: TreeDropRow[] = [row('a', 2, 0, 32), row('b', 2, 32, 32)];
    expect(levelFromPointerX(rows, 1, 50)).toBe(2);
  });

  it('picks level 1 when x is near the leftmost position', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 2, 32, 16)];
    const result = levelFromPointerX(rows, 1, 2);
    expect(result).toBe(1);
  });

  it('picks deeper level when x is indented', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 2, 32, 16)];
    const result = levelFromPointerX(rows, 1, 18);
    expect(result).toBe(2);
  });

  it('clamps within the allowed band', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0, 0), row('child', 2, 32, 16)];
    const result = levelFromPointerX(rows, 1, 1000);
    expect(result).toBe(2);
  });
});
