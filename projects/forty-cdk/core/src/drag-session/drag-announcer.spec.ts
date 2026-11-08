import type { LiveAnnouncer } from '../live-announcer/live-announcer';

import {
  clampDragIndex,
  type DragAnnouncementContext,
  DragAnnouncer,
  stepDragTarget,
} from './drag-announcer';

function list(attributes: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('ul');
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  return el;
}

function item(html: string): HTMLElement {
  const el = document.createElement('li');
  el.innerHTML = html;
  return el;
}

function setup() {
  const announced: [string, string | undefined][] = [];
  const contexts: DragAnnouncementContext[] = [];
  const announcer = {
    announce: (message: string, politeness?: string) => announced.push([message, politeness]),
  } as unknown as LiveAnnouncer;
  const positional =
    (verb: string) =>
    (label: string, index: number, total: number, context: DragAnnouncementContext) => {
      contexts.push(context);
      return `${label} ${verb} ${index}/${total}`;
    };
  const drag = new DragAnnouncer(announcer, () => ({
    lift: positional('lift'),
    move: positional('move'),
    drop: positional('drop'),
    cancel: (label) => `${label} cancel`,
  }));
  return { drag, announced, contexts };
}

describe('DragAnnouncer', () => {
  it('announces a 1-based position with the item name, lift and drop assertively and a move politely', () => {
    const { drag, announced } = setup();
    const source = list();
    const card = item('<strong>Write report</strong><span>Friday</span>');

    drag.lift({ host: card }, { index: 0, total: 3, list: source, source });
    drag.move({ host: card }, { index: 1, total: 3, list: source, source });
    drag.drop({ host: card }, { index: 1, total: 3, list: source, source });
    drag.cancel({ host: card });

    expect(announced).toEqual([
      ['Write report Friday lift 1/3', 'assertive'],
      ['Write report Friday move 2/3', 'polite'],
      ['Write report Friday drop 2/3', 'assertive'],
      ['Write report Friday cancel', 'assertive'],
    ]);
  });

  it('names the item by its textValue override when one is set', () => {
    const { drag, announced } = setup();
    const source = list();
    drag.lift(
      { host: item('ignored'), textValue: 'Custom' },
      { index: 0, total: 1, list: source, source },
    );
    expect(announced[0]![0]).toBe('Custom lift 1/1');
  });

  it('hands the builders the list name and whether the list is a transfer target', () => {
    const { drag, contexts } = setup();
    const source = list({ 'aria-label': 'To do' });
    const target = list({ 'aria-label': 'Done' });
    const unnamed = list();
    const card = item('Card');

    drag.move({ host: card }, { index: 0, total: 2, list: source, source });
    drag.move({ host: card }, { index: 0, total: 3, list: target, source });
    drag.drop({ host: card }, { index: 0, total: 3, list: unnamed, source });

    expect(contexts).toEqual([
      { list: 'To do', transfer: false },
      { list: 'Done', transfer: true },
      { list: '', transfer: true },
    ]);
  });

  it('never names a list after the items it holds', () => {
    const { drag, contexts } = setup();
    const source = list();
    source.append(item('Alpha'), item('Beta'));
    drag.lift({ host: source.firstElementChild }, { index: 0, total: 2, list: source, source });
    expect(contexts[0]!.list).toBe('');
  });

  it('names an item with no host as empty', () => {
    const { drag, announced } = setup();
    drag.cancel({ host: null });
    expect(announced[0]![0]).toBe(' cancel');
  });
});

describe('stepDragTarget', () => {
  it('returns the clamped target when it differs from the current one', () => {
    expect(stepDragTarget(0, 1, 3)).toBe(1);
    expect(stepDragTarget(1, -5, 3)).toBe(0);
    expect(stepDragTarget(1, 99, 3)).toBe(2);
  });

  it('returns null for a step clamped back onto the current target', () => {
    expect(stepDragTarget(0, -1, 3)).toBeNull();
    expect(stepDragTarget(2, 3, 3)).toBeNull();
    expect(stepDragTarget(1, 1, 3)).toBeNull();
  });
});

describe('clampDragIndex', () => {
  it('clamps to the valid positions and to 0 when there are none', () => {
    expect(clampDragIndex(-1, 3)).toBe(0);
    expect(clampDragIndex(5, 3)).toBe(2);
    expect(clampDragIndex(1, 3)).toBe(1);
    expect(clampDragIndex(4, 0)).toBe(0);
  });
});
