import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { dragStartFromPress, renderHost, type RenderResult } from '../../src/test-utils';
import { moveItemInArray } from 'forty-cdk/drag-drop';
import { ForListbox } from './listbox';
import { provideForDragDropDefaults, provideForListboxDefaults } from 'forty-cdk/defaults';
import { ForListboxOption } from './listbox-option';
import { ForListboxReorder, type ForListboxReorderEvent } from './listbox-reorder';

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      forListbox
      forListboxReorder
      multiple
      [(value)]="value"
      [disabled]="listboxDisabled()"
      [reorderDisabled]="reorderDisabled()"
      [dir]="dir()"
      (optionReorder)="onReorder($event)"
      aria-label="Tags"
    >
      @for (tag of tags(); track tag) {
        <li>
          <button type="button" forListboxOption [value]="tag" [attr.data-testid]="'opt-' + tag">
            {{ tag }}
          </button>
        </li>
      }
    </ul>
    <button type="button" data-testid="outside">outside</button>
  `,
})
class ReorderHost {
  readonly tags = signal<readonly string[]>(['a', 'b', 'c', 'd']);
  readonly value = signal<readonly string[]>([]);
  readonly listboxDisabled = signal(false);
  readonly reorderDisabled = signal(false);
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly events = signal<ForListboxReorderEvent[]>([]);

  onReorder(event: ForListboxReorderEvent): void {
    this.events.update((list) => [...list, event]);
    this.tags.update((tags) => moveItemInArray(tags, event.from, event.to));
  }
}

function dispatchKey(el: HTMLElement, key: string, opts: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  el.dispatchEvent(event);
  return event;
}

function focusOut(el: HTMLElement, relatedTarget: HTMLElement | null = null): void {
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
}

function order(queryAll: (s: string) => HTMLElement[]): string[] {
  return queryAll('[forListboxOption]').map((el) => (el.textContent ?? '').trim());
}

describe('ForListboxReorder — keyboard', () => {
  it('lifts an option with Ctrl+Space and reflects data-dragging on the container + option', async () => {
    const { query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    expect(list.getAttribute('data-dragging')).toBe('');
    expect(optB.getAttribute('data-dragging')).toBe('');
  });

  it('Ctrl+Space, ArrowDown, Space emits {from, to} and the applied order moves the option down', async () => {
    const { instance, query, queryAll, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    expect(instance.events()).toEqual([]);

    dispatchKey(list, 'ArrowDown', {});
    await f();

    dispatchKey(list, ' ', {});
    await f();

    expect(instance.events()).toEqual([{ from: 1, to: 2 }]);
    expect(order(queryAll)).toEqual(['a', 'c', 'b', 'd']);
    expect(list.hasAttribute('data-dragging')).toBe(false);
  });

  it('ArrowUp at the first index is clamped, committing a no-op move', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optA = query('[data-testid="opt-a"]')!;
    optA.focus();

    dispatchKey(optA, ' ', { ctrlKey: true });
    await f();
    dispatchKey(list, 'ArrowUp', {});
    await f();
    dispatchKey(list, 'Enter', {});
    await f();

    expect(instance.events()).toEqual([{ from: 0, to: 0 }]);
  });

  it('Home / End jump the target to the first / last position', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    dispatchKey(list, 'End', {});
    await f();
    dispatchKey(list, ' ', {});
    await f();

    expect(instance.events()).toEqual([{ from: 1, to: 3 }]);
  });

  it('Escape cancels without emitting and clears data-dragging', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    dispatchKey(list, 'ArrowDown', {});
    await f();
    dispatchKey(list, 'Escape', {});
    await f();

    expect(instance.events()).toEqual([]);
    expect(list.hasAttribute('data-dragging')).toBe(false);
    expect(optB.hasAttribute('data-dragging')).toBe(false);
  });

  it('the lift chord consumes the event so native activation is suppressed', async () => {
    const { query, flush: f } = renderHost(ReorderHost);
    await f();

    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    const event = dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    expect(event.defaultPrevented).toBe(true);
  });

  it('RTL: ArrowLeft steps forward and ArrowRight steps back', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    instance.dir.set('rtl');
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    dispatchKey(list, 'ArrowLeft', {});
    await f();
    dispatchKey(list, ' ', {});
    await f();

    expect(instance.events()).toEqual([{ from: 1, to: 2 }]);
  });
});

describe('ForListboxReorder — lift key', () => {
  it('lifts with Shift+Enter without selecting the option', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    const event = dispatchKey(optB, 'Enter', { shiftKey: true });
    await f();

    expect(event.defaultPrevented).toBe(true);
    expect(optB.getAttribute('data-dragging')).toBe('');
    expect(instance.value()).toEqual([]);
  });

  it('does not lift on a Shift+Enter that commits an IME composition', async () => {
    const { query, flush: f } = renderHost(ReorderHost);
    await f();

    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, 'Enter', { shiftKey: true, isComposing: true });
    await f();

    expect(optB.hasAttribute('data-dragging')).toBe(false);
  });

  it('lifts with the scope liftKey and no longer with the default chords', async () => {
    TestBed.configureTestingModule({
      providers: [provideForDragDropDefaults({ liftKey: (event) => event.key === 'F2' })],
    });
    const { query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    dispatchKey(optB, 'Enter', { shiftKey: true });
    await f();
    expect(list.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(optB, 'F2');
    await f();
    expect(optB.getAttribute('data-dragging')).toBe('');
  });
});

describe('ForListboxReorder — a focusout only cancels when focus really left the listbox', () => {
  it('keeps the lift when the focusout reports no destination and focus is still inside', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    focusOut(optB);
    await f();

    expect(list.getAttribute('data-dragging')).toBe('');

    dispatchKey(list, 'ArrowDown', {});
    await f();
    dispatchKey(list, ' ', {});
    await f();

    expect(instance.events()).toEqual([{ from: 1, to: 2 }]);
  });

  it('keeps the lift when focus moves to another option inside the listbox', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    focusOut(optB, query('[data-testid="opt-c"]')!);
    await f();

    expect(list.getAttribute('data-dragging')).toBe('');

    dispatchKey(list, ' ', {});
    await f();

    expect(instance.events()).toEqual([{ from: 1, to: 1 }]);
  });

  it('cancels the lift when focus lands on an element outside the listbox', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    focusOut(optB, query('[data-testid="outside"]')!);
    await f();

    expect(list.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(list, ' ', {});
    await f();

    expect(instance.events()).toEqual([]);
  });

  it('cancels the lift when the focusout reports no destination and focus left the listbox', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    optB.blur();
    focusOut(optB);
    await f();

    expect(list.hasAttribute('data-dragging')).toBe(false);
    expect(instance.events()).toEqual([]);
  });
});

describe('ForListboxReorder — does not interfere with selection', () => {
  it('a plain Space does not start a reorder (native activation untouched)', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    const event = dispatchKey(optB, ' ', {});
    await f();
    expect(event.defaultPrevented).toBe(false);
    expect(list.hasAttribute('data-dragging')).toBe(false);

    // No lift means a following ArrowDown + Space cannot commit a reorder.
    dispatchKey(list, 'ArrowDown', {});
    dispatchKey(list, ' ', {});
    await f();
    expect(instance.events()).toEqual([]);
  });

  it('clicking an option still toggles selection while the coordinator is attached', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    await f();

    const optC = query<HTMLButtonElement>('[data-testid="opt-c"]')!;
    optC.click();
    await f();

    expect(instance.value()).toEqual(['c']);
    expect(instance.events()).toEqual([]);
  });
});

describe('ForListboxReorder — disabled paths', () => {
  it('does not lift when reorderDisabled is set', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    instance.reorderDisabled.set(true);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    const event = dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    expect(event.defaultPrevented).toBe(false);
    expect(list.hasAttribute('data-dragging')).toBe(false);
  });

  it('does not lift when the listbox itself is disabled', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    instance.listboxDisabled.set(true);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    expect(list.hasAttribute('data-dragging')).toBe(false);
  });

  it('re-enables reorder reactively when reorderDisabled flips back to false', async () => {
    const { instance, query, flush: f } = renderHost(ReorderHost);
    instance.reorderDisabled.set(true);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    expect(list.hasAttribute('data-dragging')).toBe(false);

    instance.reorderDisabled.set(false);
    await f();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    expect(list.getAttribute('data-dragging')).toBe('');
  });
});

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideForListboxDefaults({
      reorderAnnounceLift: (label, index, total) => `[lift] ${label} ${index}/${total}`,
      reorderAnnounceMove: (label, index, total) => `[move] ${label} ${index}/${total}`,
      reorderAnnounceDrop: (label, index, total) => `[drop] ${label} ${index}/${total}`,
      reorderAnnounceCancel: (label) => `[cancel] ${label}`,
    }),
  ],
  template: `
    <ul forListbox forListboxReorder multiple [(value)]="value" aria-label="Tags">
      @for (tag of tags(); track tag) {
        <li>
          <button type="button" forListboxOption [value]="tag" [attr.data-testid]="'opt-' + tag">
            {{ tag }}
          </button>
        </li>
      }
    </ul>
  `,
})
class ReorderI18nHost {
  readonly tags = signal<readonly string[]>(['a', 'b', 'c', 'd']);
  readonly value = signal<readonly string[]>([]);
}

function liveRegion(politeness: 'polite' | 'assertive'): HTMLElement | undefined {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(`[aria-live="${politeness}"]`),
  ).find((el) => !el.closest('[forListbox]'));
}

describe('ForListboxReorder — i18n announcements', () => {
  it('lift / move / drop announce via the consumer-provided formatters', async () => {
    const { query, flush: f } = renderHost(ReorderI18nHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    expect(liveRegion('assertive')?.textContent).toBe('[lift] b 2/4');

    dispatchKey(list, 'ArrowDown', {});
    await f();
    expect(liveRegion('polite')?.textContent).toBe('[move] b 3/4');

    dispatchKey(list, ' ', {});
    await f();
    expect(liveRegion('assertive')?.textContent).toBe('[drop] b 3/4');
  });

  it('cancel announces via the consumer-provided formatter', async () => {
    const { query, flush: f } = renderHost(ReorderI18nHost);
    await f();

    const list = query('[forListbox]')!;
    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();
    dispatchKey(list, 'Escape', {});
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[cancel] b');
  });

  it('falls back to the English phrasing when no override is provided', async () => {
    const { query, flush: f } = renderHost(ReorderHost);
    await f();

    const optB = query('[data-testid="opt-b"]')!;
    optB.focus();

    dispatchKey(optB, ' ', { ctrlKey: true });
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('b, lifted. 2 of 4.');
  });
});

describe('ForListboxReorder — focus follows the dropped option (#2118)', () => {
  async function drop(from: string, keys: readonly string[]) {
    const harness = renderHost(ReorderHost);
    await harness.flush();
    const list = harness.query('[forListbox]')!;
    const option = harness.query(`[data-testid="opt-${from}"]`)!;
    option.focus();
    dispatchKey(option, ' ', { ctrlKey: true });
    await harness.flush();
    for (const key of keys) {
      dispatchKey(list, key);
      await harness.flush();
    }
    dispatchKey(list, ' ');
    await harness.flush();
    await harness.flush();
    return harness;
  }

  it('a keyboard drop moving an option down keeps focus on it', async () => {
    const { query, queryAll } = await drop('b', ['ArrowDown']);

    expect(order(queryAll)).toEqual(['a', 'c', 'b', 'd']);
    expect(document.activeElement).toBe(query('[data-testid="opt-b"]'));
  });

  it('a keyboard drop moving an option up keeps focus on it', async () => {
    const { query, queryAll } = await drop('c', ['ArrowUp']);

    expect(order(queryAll)).toEqual(['a', 'c', 'b', 'd']);
    expect(document.activeElement).toBe(query('[data-testid="opt-c"]'));
  });

  it('a keyboard drop to the start keeps focus on the moved option', async () => {
    const { query, queryAll } = await drop('d', ['Home']);

    expect(order(queryAll)).toEqual(['d', 'a', 'b', 'c']);
    expect(document.activeElement).toBe(query('[data-testid="opt-d"]'));
  });
});

function firePointer(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  init: Partial<PointerEventInit> = {},
): PointerEvent {
  const event = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('ForListboxReorder — a keyboard lift owns the list until it ends (#2714)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  async function liftA(): Promise<RenderResult<ReorderHost>> {
    const rendered = renderHost(ReorderHost);
    await rendered.flush();
    const optA = rendered.query('[data-testid="opt-a"]')!;
    optA.focus();
    dispatchKey(optA, ' ', { ctrlKey: true });
    await rendered.flush();
    return rendered;
  }

  it('cancels the lift when another option is pressed, so the press never re-targets it', async () => {
    const rendered = await liftA();
    const { instance, query, queryAll, flush: f } = rendered;
    const list = query('[forListbox]')!;
    dispatchKey(list, 'ArrowDown');
    dispatchKey(list, 'ArrowDown');
    await f();

    const optD = query('[data-testid="opt-d"]')!;
    firePointer(optD, 'pointerdown', 10, 10);
    optD.focus();
    firePointer(optD, 'pointerup', 10, 10);
    await f();

    expect(list.hasAttribute('data-dragging')).toBe(false);
    expect(liveRegion('assertive')?.textContent).toBe('a, movement cancelled.');

    dispatchKey(optD, 'Enter');
    await f();

    expect(instance.events()).toEqual([]);
    expect(order(queryAll)).toEqual(['a', 'b', 'c', 'd']);
    expect(queryAll('[forListboxOption][data-dragging]')).toEqual([]);
  });

  it('starts no pointer drag beside the lift when the lifted option itself is pressed', async () => {
    const rendered = await liftA();
    const { instance, query, flush: f } = rendered;
    const list = query('[forListbox]')!;
    const optA = query('[data-testid="opt-a"]')!;
    dispatchKey(list, 'ArrowDown');
    await f();

    firePointer(optA, 'pointerdown', 10, 10);
    firePointer(document, 'pointermove', 10, 40);
    firePointer(document, 'pointerup', 10, 40);
    await f();

    expect(list.getAttribute('data-dragging')).toBe('');
    expect(instance.events()).toEqual([]);

    dispatchKey(optA, 'Enter');
    await f();

    expect(instance.events()).toEqual([{ from: 0, to: 1 }]);
  });

  it('consumes PageDown, so focus stays on the lifted option', async () => {
    const { query, flush: f } = await liftA();
    const optA = query('[data-testid="opt-a"]')!;

    const pageDown = dispatchKey(optA, 'PageDown');
    await f();

    expect(pageDown.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(optA);
  });

  it('consumes a typeahead character, so focus stays on the lifted option', async () => {
    const { query, flush: f } = await liftA();
    const optA = query('[data-testid="opt-a"]')!;

    const letter = dispatchKey(optA, 'c');
    await f();

    expect(letter.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(optA);
  });

  it('keeps Ctrl+A away from the options, leaving the selection unchanged', async () => {
    const { instance, query, flush: f } = await liftA();
    const optA = query('[data-testid="opt-a"]')!;

    dispatchKey(optA, 'a', { ctrlKey: true });
    await f();

    expect(instance.value()).toEqual([]);
    expect(document.activeElement).toBe(optA);
  });

  it('leaves the browser default of a Ctrl / Cmd chord and of a function key alone', async () => {
    const { query, flush: f } = await liftA();
    const optA = query('[data-testid="opt-a"]')!;

    const chord = dispatchKey(optA, 'r', { ctrlKey: true });
    const fKey = dispatchKey(optA, 'F5');
    await f();

    expect(chord.defaultPrevented).toBe(false);
    expect(fKey.defaultPrevented).toBe(false);
  });
});

@Component({
  host: { 'data-fixture': 'native-drag' },
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <div forListbox forListboxReorder aria-label="Tags">
      <div forListboxOption value="alpha">
        <img alt="" data-testid="alpha-thumb" />
        <a href="#alpha" data-testid="alpha-link">Alpha</a>
      </div>
      <div forListboxOption value="bravo">Bravo</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NativeDragHost {}

describe('ForListboxReorder — native drag', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  for (const testid of ['alpha-thumb', 'alpha-link']) {
    it(`cancels the native dragstart a press on ${testid} raises`, async () => {
      const { query, flush: f } = renderHost(NativeDragHost);
      await f();
      const target = query<HTMLElement>(`[data-testid="${testid}"]`)!;

      expect(dragStartFromPress(target).defaultPrevented).toBe(true);
    });
  }
});
