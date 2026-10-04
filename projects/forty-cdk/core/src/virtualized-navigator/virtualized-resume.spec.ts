import { signal } from '@angular/core';

import { unsetInput } from '../unset-input/unset-input';
import { VirtualizedResume, type VirtualizedResumeEntry } from './virtualized-resume';

function setup(entries: readonly [number, string][]) {
  const total = signal<number | undefined>(10);
  const snapshot = signal(
    new Map<number, VirtualizedResumeEntry<string>>(
      entries.map(([pos, value]) => [pos, { id: `id-${pos}`, disabled: false, value }]),
    ),
  );
  const compareWith = signal((a: string, b: string) => a === b);
  const resume = new VirtualizedResume<string, VirtualizedResumeEntry<string>>({
    totalCount: total,
    snapshotByPos: () => snapshot(),
    compareWith,
  });
  return { resume, total, snapshot, compareWith };
}

describe('VirtualizedResume', () => {
  it('resolves nothing until a position is retained', () => {
    const { resume } = setup([[3, 'c']]);
    expect(resume.resolve()).toBeNull();
    expect(resume.pos()).toBeNull();
  });

  it('resolves a retained position to its snapshot entry', () => {
    const { resume } = setup([[3, 'c']]);
    resume.retain(3, 'c');
    expect(resume.pos()).toBe(3);
    expect(resume.resolve()?.entry.id).toBe('id-3');
  });

  it('forgets the position on clear', () => {
    const { resume } = setup([[3, 'c']]);
    resume.retain(3, 'c');
    resume.clear();
    expect(resume.pos()).toBeNull();
  });

  it('retains nothing for an unknown position or an unwritten value binding', () => {
    const { resume } = setup([[3, 'c']]);
    resume.retain(null, 'c');
    expect(resume.pos()).toBeNull();
    resume.retain(3, unsetInput<string>());
    expect(resume.pos()).toBeNull();
  });

  it('resolves nothing once the snapshot no longer holds the position', () => {
    const { resume, snapshot } = setup([[3, 'c']]);
    resume.retain(3, 'c');
    snapshot.set(new Map());
    expect(resume.pos()).toBeNull();
  });

  it('resolves nothing once a different item occupies the position', () => {
    const { resume, snapshot } = setup([[3, 'c']]);
    resume.retain(3, 'c');
    snapshot.set(new Map([[3, { id: 'id-3', disabled: false, value: 'z' }]]));
    expect(resume.pos()).toBeNull();
  });

  it('matches the retained value through compareWith', () => {
    const { resume, compareWith } = setup([[3, 'C']]);
    resume.retain(3, 'c');
    expect(resume.pos()).toBeNull();
    compareWith.set((a, b) => a.toLowerCase() === b.toLowerCase());
    expect(resume.pos()).toBe(3);
  });

  it('resolves nothing when the position falls outside the total', () => {
    const { resume, total } = setup([[3, 'c']]);
    resume.retain(3, 'c');
    total.set(3);
    expect(resume.pos()).toBeNull();
    total.set(undefined);
    expect(resume.pos()).toBeNull();
  });
});
