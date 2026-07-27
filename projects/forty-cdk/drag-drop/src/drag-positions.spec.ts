import { buildDragSlots, indexOfSlot, stepSlot } from './drag-positions';

describe('buildDragSlots', () => {
  it('produces source-only slots for a single list', () => {
    const slots = buildDragSlots(3, []);
    expect(slots).toEqual([
      { containerIndex: 0, index: 0 },
      { containerIndex: 0, index: 1 },
      { containerIndex: 0, index: 2 },
    ]);
  });

  it('produces source slots plus connected slots for one connected list', () => {
    const slots = buildDragSlots(2, [1]);
    expect(slots).toEqual([
      { containerIndex: 0, index: 0 },
      { containerIndex: 0, index: 1 },
      { containerIndex: 1, index: 0 },
      { containerIndex: 1, index: 1 },
    ]);
  });

  it('produces source slots plus connected slots for several connected lists', () => {
    const slots = buildDragSlots(2, [2, 0]);
    expect(slots).toEqual([
      { containerIndex: 0, index: 0 },
      { containerIndex: 0, index: 1 },
      { containerIndex: 1, index: 0 },
      { containerIndex: 1, index: 1 },
      { containerIndex: 1, index: 2 },
      { containerIndex: 2, index: 0 },
    ]);
  });

  it('produces an empty array for a zero-item source with no connected lists', () => {
    expect(buildDragSlots(0, [])).toEqual([]);
  });

  it('produces only the append slot for a connected list with zero items', () => {
    const slots = buildDragSlots(1, [0]);
    expect(slots).toContainEqual({ containerIndex: 1, index: 0 });
  });

  it('produces one slot per existing source item (not gaps)', () => {
    const slots = buildDragSlots(3, []);
    expect(slots.filter((s) => s.containerIndex === 0)).toHaveLength(3);
  });

  it('produces one slot per insertion gap in connected list (count + 1)', () => {
    const slots = buildDragSlots(1, [3]);
    const connected = slots.filter((s) => s.containerIndex === 1);
    expect(connected).toHaveLength(4);
  });
});

describe('indexOfSlot', () => {
  it('returns the flat index of an existing slot', () => {
    const slots = buildDragSlots(2, [1]);
    expect(indexOfSlot(slots, 0, 0)).toBe(0);
    expect(indexOfSlot(slots, 0, 1)).toBe(1);
    expect(indexOfSlot(slots, 1, 0)).toBe(2);
    expect(indexOfSlot(slots, 1, 1)).toBe(3);
  });

  it('returns -1 for a slot that does not exist', () => {
    const slots = buildDragSlots(1, []);
    expect(indexOfSlot(slots, 0, 5)).toBe(-1);
    expect(indexOfSlot(slots, 1, 0)).toBe(-1);
  });
});

describe('stepSlot', () => {
  it('steps forward by 1', () => {
    const slots = buildDragSlots(3, []);
    expect(stepSlot(slots, 0, 1)).toBe(1);
    expect(stepSlot(slots, 1, 1)).toBe(2);
  });

  it('steps backward by 1', () => {
    const slots = buildDragSlots(3, []);
    expect(stepSlot(slots, 2, -1)).toBe(1);
    expect(stepSlot(slots, 1, -1)).toBe(0);
  });

  it('clamps at the start (no wrap)', () => {
    const slots = buildDragSlots(3, []);
    expect(stepSlot(slots, 0, -1)).toBe(0);
  });

  it('clamps at the end (no wrap)', () => {
    const slots = buildDragSlots(3, []);
    expect(stepSlot(slots, 2, 1)).toBe(2);
  });

  it('returns current unchanged for an empty slot array', () => {
    expect(stepSlot([], 0, 1)).toBe(0);
    expect(stepSlot([], 5, -1)).toBe(5);
  });
});
