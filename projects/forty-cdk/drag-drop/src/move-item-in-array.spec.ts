import { moveItemInArray, transferArrayItem } from './move-item-in-array';

describe('moveItemInArray', () => {
  it('moves an item forward', () => {
    expect(moveItemInArray(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item backward', () => {
    expect(moveItemInArray(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns a shallow copy on no-op (same index)', () => {
    const arr = ['a', 'b'];
    const result = moveItemInArray(arr, 1, 1);
    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(arr);
  });

  it('clamps out-of-range from index', () => {
    expect(moveItemInArray(['a', 'b', 'c'], -1, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItemInArray(['a', 'b', 'c'], 99, 0)).toEqual(['c', 'a', 'b']);
  });

  it('clamps out-of-range to index', () => {
    expect(moveItemInArray(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
  });

  it('returns an empty array for empty input', () => {
    expect(moveItemInArray([], 0, 0)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const arr = ['a', 'b', 'c'];
    moveItemInArray(arr, 0, 2);
    expect(arr).toEqual(['a', 'b', 'c']);
  });
});

describe('transferArrayItem', () => {
  it('moves an item from the middle of one array to another', () => {
    const result = transferArrayItem(['a', 'b', 'c'], ['x', 'y'], 1, 1);
    expect(result.from).toEqual(['a', 'c']);
    expect(result.to).toEqual(['x', 'b', 'y']);
  });

  it('appends when toIndex equals to.length', () => {
    const result = transferArrayItem(['a', 'b'], ['x'], 0, 1);
    expect(result.from).toEqual(['b']);
    expect(result.to).toEqual(['x', 'a']);
  });

  it('inserts at index 0 (prepend)', () => {
    const result = transferArrayItem(['a', 'b'], ['x'], 1, 0);
    expect(result.from).toEqual(['a']);
    expect(result.to).toEqual(['b', 'x']);
  });

  it('returns copies when from is empty', () => {
    const from: string[] = [];
    const to = ['x'];
    const result = transferArrayItem(from, to, 0, 0);
    expect(result.from).toEqual([]);
    expect(result.to).toEqual(['x']);
    expect(result.from).not.toBe(from);
    expect(result.to).not.toBe(to);
  });

  it('does not mutate either input', () => {
    const from = ['a', 'b'];
    const to = ['x', 'y'];
    transferArrayItem(from, to, 0, 0);
    expect(from).toEqual(['a', 'b']);
    expect(to).toEqual(['x', 'y']);
  });
});
