import { computeFlatHierarchy } from './flat-hierarchy';

describe('computeFlatHierarchy', () => {
  it('returns empty array for empty input', () => {
    expect(computeFlatHierarchy([])).toEqual([]);
  });

  it('single node at level 1 → posinset=1, setsize=1', () => {
    expect(computeFlatHierarchy([1])).toEqual([{ posinset: 1, setsize: 1 }]);
  });

  it('flat siblings all at level 1 → posinset 1..n, setsize n', () => {
    const result = computeFlatHierarchy([1, 1, 1]);
    expect(result).toEqual([
      { posinset: 1, setsize: 3 },
      { posinset: 2, setsize: 3 },
      { posinset: 3, setsize: 3 },
    ]);
  });

  it('nested case [1,2,3,2,1]: parent A; child A1 with grandchild A1a; child A2; sibling B', () => {
    const result = computeFlatHierarchy([1, 2, 3, 2, 1]);
    expect(result).toEqual([
      { posinset: 1, setsize: 2 },
      { posinset: 1, setsize: 2 },
      { posinset: 1, setsize: 1 },
      { posinset: 2, setsize: 2 },
      { posinset: 2, setsize: 2 },
    ]);
  });

  it('deeper descendant between two same-level siblings does not break the sibling count', () => {
    const result = computeFlatHierarchy([1, 2, 3, 3, 2, 1]);
    expect(result).toEqual([
      { posinset: 1, setsize: 2 },
      { posinset: 1, setsize: 2 },
      { posinset: 1, setsize: 2 },
      { posinset: 2, setsize: 2 },
      { posinset: 2, setsize: 2 },
      { posinset: 2, setsize: 2 },
    ]);
  });

  it('single child at level 2 under a single parent', () => {
    const result = computeFlatHierarchy([1, 2]);
    expect(result).toEqual([
      { posinset: 1, setsize: 1 },
      { posinset: 1, setsize: 1 },
    ]);
  });

  it('two top-level parents each with one child', () => {
    const result = computeFlatHierarchy([1, 2, 1, 2]);
    expect(result).toEqual([
      { posinset: 1, setsize: 2 },
      { posinset: 1, setsize: 1 },
      { posinset: 2, setsize: 2 },
      { posinset: 1, setsize: 1 },
    ]);
  });

  it('non-contiguous siblings back-fill setsize across interleaved children [1,2,1,2,1]', () => {
    const result = computeFlatHierarchy([1, 2, 1, 2, 1]);
    expect(result).toEqual([
      { posinset: 1, setsize: 3 },
      { posinset: 1, setsize: 1 },
      { posinset: 2, setsize: 3 },
      { posinset: 1, setsize: 1 },
      { posinset: 3, setsize: 3 },
    ]);
  });

  it('level jump skips an intermediate level [1,3,3,1]', () => {
    const result = computeFlatHierarchy([1, 3, 3, 1]);
    expect(result).toEqual([
      { posinset: 1, setsize: 2 },
      { posinset: 1, setsize: 2 },
      { posinset: 2, setsize: 2 },
      { posinset: 2, setsize: 2 },
    ]);
  });

  it('deeper-then-shallower start does not underflow the stack [2,1,2]', () => {
    const result = computeFlatHierarchy([2, 1, 2]);
    expect(result).toEqual([
      { posinset: 1, setsize: 1 },
      { posinset: 1, setsize: 1 },
      { posinset: 1, setsize: 1 },
    ]);
  });
});
