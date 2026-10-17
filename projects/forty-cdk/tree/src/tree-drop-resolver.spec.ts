import {
  levelFromPointerX,
  resolveTreeDrop,
  TREE_DROP_FALLBACK_INDENT_PX,
  treeIndentStep,
  type TreeDropRow,
} from './tree-drop-resolver';

const byIdentity = (a: unknown, b: unknown): boolean => a === b;

function row(value: string, level: number, top: number, start = level * 16): TreeDropRow {
  return { value, level, start, top, bottom: top + 32 };
}

describe('resolveTreeDrop', () => {
  it('returns root index 0 for empty rows', () => {
    const result = resolveTreeDrop([], 0, 1, byIdentity);
    expect(result).toEqual({ parentValue: null, index: 0, level: 1, siblingCount: 0 });
  });

  it('drops between two same-level siblings (reorder)', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32), row('c', 1, 64)];
    const result = resolveTreeDrop(rows, 1, 1, byIdentity);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('drops after the last row at root level', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32)];
    const result = resolveTreeDrop(rows, 2, 1, byIdentity);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(2);
  });

  it('drops at gap 0 (before all rows)', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32)];
    const result = resolveTreeDrop(rows, 0, 1, byIdentity);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(0);
  });

  it('re-parents into a parent at child depth', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('sibling', 1, 32)];
    const result = resolveTreeDrop(rows, 1, 2, byIdentity);
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
    const result = resolveTreeDrop(rows, 2, 2, byIdentity);
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
    const result = resolveTreeDrop(rows, 3, 1, byIdentity);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('clamps up to the following row level (cannot be shallower than next)', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('child', 2, 32)];
    const result = resolveTreeDrop(rows, 1, 1, byIdentity);
    expect(result.parentValue).toBe('parent');
    expect(result.level).toBe(2);
    expect(result.index).toBe(0);
  });

  it('clamps to maxLevel when desired level is too deep', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32)];
    const result = resolveTreeDrop(rows, 1, 5, byIdentity);
    expect(result.level).toBe(2);
  });

  it('resolves shallow level (out to root / shallower parent) when desired is 1', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('child', 2, 32), row('sibling', 1, 64)];
    const result = resolveTreeDrop(rows, 2, 1, byIdentity);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('correctly counts index among siblings under same parent', () => {
    const rows: TreeDropRow[] = [row('parent', 1, 0), row('child1', 2, 32), row('child2', 2, 64)];
    const result = resolveTreeDrop(rows, 3, 2, byIdentity);
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
    const result = resolveTreeDrop(rows, 3, 2, byIdentity);
    expect(result.parentValue).toBe('root1');
    expect(result.level).toBe(2);
    expect(result.index).toBe(1);
  });

  it('handles single row case', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0)];
    const result = resolveTreeDrop(rows, 1, 1, byIdentity);
    expect(result.parentValue).toBeNull();
    expect(result.level).toBe(1);
    expect(result.index).toBe(1);
  });

  it('resolves exactly prev + 1 when the next row is deeper than prev + 1', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 3, 32)];
    const result = resolveTreeDrop(rows, 1, 1, byIdentity);
    expect(result.level).toBe(2);
    expect(result.parentValue).toBe('a');
  });

  describe('siblingCount', () => {
    it('counts all root-level siblings regardless of the gap', () => {
      const rows: TreeDropRow[] = [row('a', 1, 0), row('b', 1, 32), row('c', 1, 64)];
      const result = resolveTreeDrop(rows, 1, 1, byIdentity);
      expect(result.siblingCount).toBe(3);
    });

    it('counts only the children under the resolved parent', () => {
      const rows: TreeDropRow[] = [
        row('parent', 1, 0),
        row('child1', 2, 32),
        row('child2', 2, 64),
        row('other', 1, 96),
      ];
      const result = resolveTreeDrop(rows, 3, 2, byIdentity);
      expect(result.parentValue).toBe('parent');
      expect(result.level).toBe(2);
      expect(result.siblingCount).toBe(2);
    });

    it('is 0 when no existing row sits at the resolved level under the parent', () => {
      const rows: TreeDropRow[] = [row('parent', 1, 0), row('sibling', 1, 32)];
      const result = resolveTreeDrop(rows, 1, 2, byIdentity);
      expect(result.parentValue).toBe('parent');
      expect(result.level).toBe(2);
      expect(result.siblingCount).toBe(0);
    });
  });
});

describe('treeIndentStep', () => {
  it('falls back while only one depth is visible', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 1, 32, 0)];
    expect(treeIndentStep(rows, 'ltr')).toBe(TREE_DROP_FALLBACK_INDENT_PX);
  });

  it('falls back when the rows show no indentation', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 2, 32, 0), row('c', 3, 64, 0)];
    expect(treeIndentStep(rows, 'ltr')).toBe(TREE_DROP_FALLBACK_INDENT_PX);
  });

  it('reads the step between the edges of successive visible depths', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 2, 32, 40), row('c', 4, 64, 120)];
    expect(treeIndentStep(rows, 'ltr')).toBe(40);
  });

  it('measures toward inline-start under rtl', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 400), row('b', 2, 32, 360)];
    expect(treeIndentStep(rows, 'rtl')).toBe(40);
    expect(treeIndentStep(rows, 'ltr')).toBe(TREE_DROP_FALLBACK_INDENT_PX);
  });
});

describe('levelFromPointerX', () => {
  const at = (level: number, x = 100) => ({ level, x });

  it('returns 1 for empty rows', () => {
    expect(levelFromPointerX([], 0, 500, at(3), 'ltr')).toBe(1);
  });

  it('keeps the lifted depth while the pointer has not moved horizontally', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 2, 32, 40), row('c', 1, 64, 0)];
    expect(levelFromPointerX(rows, 2, 100, at(2), 'ltr')).toBe(2);
  });

  it('all rows at level 1: moving past half an indent toward inline-end resolves level 2', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 1, 32, 0)];
    expect(levelFromPointerX(rows, 1, 100 + TREE_DROP_FALLBACK_INDENT_PX, at(1), 'ltr')).toBe(2);
    expect(levelFromPointerX(rows, 1, 999, at(1), 'ltr')).toBe(2);
  });

  it('reaches prev + 1 when no visible row sits at that depth', () => {
    const rows: TreeDropRow[] = [
      row('a', 1, 0, 0),
      row('b', 2, 32, 40),
      row('c', 2, 64, 40),
      row('d', 1, 96, 0),
    ];
    expect(levelFromPointerX(rows, 3, 180, at(1), 'ltr')).toBe(3);
  });

  it('steps by the indent the visible rows show', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 0), row('b', 2, 32, 40), row('c', 1, 64, 0)];
    expect(levelFromPointerX(rows, 3, 115, at(1), 'ltr')).toBe(1);
    expect(levelFromPointerX(rows, 3, 125, at(1), 'ltr')).toBe(2);
  });

  it('far toward inline-start returns the band minimum when it is above 1', () => {
    const rows: TreeDropRow[] = [row('p', 1, 0, 0), row('c1', 2, 32, 40), row('c2', 2, 64, 40)];
    expect(levelFromPointerX(rows, 2, -900, at(3), 'ltr')).toBe(2);
  });

  it('returns the only allowed level wherever the pointer is when the band is one level wide', () => {
    const rows: TreeDropRow[] = [row('p', 1, 0, 0), row('c', 2, 32, 40)];
    expect(levelFromPointerX(rows, 1, -900, at(1), 'ltr')).toBe(2);
    expect(levelFromPointerX(rows, 1, 900, at(1), 'ltr')).toBe(2);
  });

  it('deepens toward the left under rtl and outdents toward the right', () => {
    const rows: TreeDropRow[] = [row('a', 1, 0, 400), row('b', 2, 32, 360), row('c', 1, 64, 400)];
    expect(levelFromPointerX(rows, 3, 60, at(1), 'rtl')).toBe(2);
    expect(levelFromPointerX(rows, 3, 60, at(1), 'ltr')).toBe(1);
    expect(levelFromPointerX(rows, 2, 140, at(2), 'rtl')).toBe(1);
  });
});
