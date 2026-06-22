import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { flush, renderHost } from '../../src/test-utils';
import { moveItemInArray } from 'forty-cdk/drag-drop';
import { ForListbox } from './listbox';
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

  it('re-enables reorder reactively without Zone.js when reorderDisabled flips back to false', async () => {
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
