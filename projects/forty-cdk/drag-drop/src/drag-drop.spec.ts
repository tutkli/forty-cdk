import {
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { withReducedMotion } from '../../src/test-utils/reduced-motion';

import { flush, nextMacrotask, pressKey, renderHost } from '../../src/test-utils';
import { provideForDragDropDefaults } from './drag-drop-defaults';
import { ForDragHandle } from './drag-handle';
import { ForDragPlaceholder } from './drag-placeholder';
import { ForDragPreview } from './drag-preview';
import { ForDraggable } from './draggable';
import { ForDropList } from './drop-list';
import { ForDropListGroup } from './drop-list-group';
import { moveItemInArray, transferArrayItem } from './move-item-in-array';
import {
  FOR_DRAGGABLE_LIFT_GUARD,
  FOR_DROP_LIST_ROVING_DELEGATE,
  type ForDragDropEvent,
  type ForDraggableLiftGuard,
  type ForDropListRovingDelegate,
} from './drag-drop-context';

const DND_IMPORTS = [ForDropList, ForDraggable] as const;
const HANDLE_IMPORTS = [ForDropList, ForDraggable, ForDragHandle] as const;
const GROUP_IMPORTS = [ForDropList, ForDraggable, ForDropListGroup] as const;

interface Row {
  id: number;
  label: string;
  disabled?: boolean;
}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul
      forDropList
      [orientation]="orientation()"
      [dir]="dir()"
      [disabled]="listDisabled()"
      [animateReorder]="animate()"
      (dragDrop)="onDrop($event)"
    >
      @for (row of rows(); track row.id) {
        <li
          forDraggable
          [dragData]="row"
          [dragDisabled]="!!row.disabled"
          [attr.data-test-id]="row.id"
        >
          {{ row.label }}
        </li>
      }
    </ul>
  `,
})
class SingleListHost {
  readonly rows: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);
  readonly orientation = signal<'vertical' | 'horizontal' | 'mixed'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly listDisabled = signal(false);
  readonly animate = signal(false);
  readonly lastDrop = signal<ForDragDropEvent | null>(null);
  onDrop(event: ForDragDropEvent): void {
    this.lastDrop.set(event);
  }
}

@Component({
  imports: [...GROUP_IMPORTS],
  template: `
    <div forDropListGroup>
      <ul forDropList (dragDrop)="onDropA($event)">
        @for (row of rowsA(); track row.id) {
          <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">{{ row.label }}</li>
        }
      </ul>
      <ul forDropList (dragDrop)="onDropB($event)">
        @for (row of rowsB(); track row.id) {
          <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">{{ row.label }}</li>
        }
      </ul>
    </div>
  `,
})
class TwoListGroupHost {
  readonly rowsA: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
  ]);
  readonly rowsB: WritableSignal<Row[]> = signal([{ id: 3, label: 'Gamma' }]);
  readonly lastDropA = signal<ForDragDropEvent | null>(null);
  readonly lastDropB = signal<ForDragDropEvent | null>(null);
  onDropA(e: ForDragDropEvent): void {
    this.lastDropA.set(e);
  }
  onDropB(e: ForDragDropEvent): void {
    this.lastDropB.set(e);
  }
}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul forDropList #listA="forDropList" [connectedTo]="[listB]" (dragDrop)="onDropA($event)">
      @for (row of rowsA(); track row.id) {
        <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">{{ row.label }}</li>
      }
    </ul>
    <ul forDropList #listB="forDropList" [connectedTo]="[listA]" (dragDrop)="onDropB($event)">
      @for (row of rowsB(); track row.id) {
        <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">{{ row.label }}</li>
      }
    </ul>
  `,
})
class TwoListConnectedHost {
  readonly rowsA: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
  ]);
  readonly rowsB: WritableSignal<Row[]> = signal([{ id: 3, label: 'Gamma' }]);
  readonly lastDropA = signal<ForDragDropEvent | null>(null);
  readonly lastDropB = signal<ForDragDropEvent | null>(null);
  onDropA(e: ForDragDropEvent): void {
    this.lastDropA.set(e);
  }
  onDropB(e: ForDragDropEvent): void {
    this.lastDropB.set(e);
  }
}

@Component({
  imports: [...GROUP_IMPORTS],
  template: `
    <div forDropListGroup>
      <ul forDropList #listA="forDropList" (dragDrop)="onDrop($event)">
        @for (row of rowsA(); track row.id) {
          <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">{{ row.label }}</li>
        }
      </ul>
      <ul forDropList (dragDrop)="onDrop($event)">
        @for (row of rowsB(); track row.id) {
          <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">{{ row.label }}</li>
        }
      </ul>
    </div>
    <button type="button" data-test-id="outside">outside</button>
  `,
})
class AppliedMoveHost {
  readonly listA = viewChild.required<ForDropList>('listA');
  readonly rowsA: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);
  readonly rowsB: WritableSignal<Row[]> = signal([
    { id: 4, label: 'Delta' },
    { id: 5, label: 'Epsilon' },
  ]);
  readonly focusOutsideOnDrop = signal(false);
  onDrop(event: ForDragDropEvent): void {
    if (event.previousContainer === event.container) {
      const list = event.container === this.listA() ? this.rowsA : this.rowsB;
      list.set(moveItemInArray(list(), event.previousIndex, event.currentIndex));
    } else {
      const fromA = event.previousContainer === this.listA();
      const result = transferArrayItem(
        fromA ? this.rowsA() : this.rowsB(),
        fromA ? this.rowsB() : this.rowsA(),
        event.previousIndex,
        event.currentIndex,
      );
      (fromA ? this.rowsA : this.rowsB).set(result.from);
      (fromA ? this.rowsB : this.rowsA).set(result.to);
    }
    if (this.focusOutsideOnDrop()) {
      document.querySelector<HTMLElement>('[data-test-id="outside"]')?.focus();
    }
  }
}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul forDropList (dragDrop)="onDrop()">
      @for (row of rows(); track row.id) {
        <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">{{ row.label }}</li>
      }
    </ul>
  `,
})
class RemoveOnDropHost {
  readonly rows: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);
  onDrop(): void {
    this.rows.update((rows) => rows.filter((row) => row.id !== 1));
  }
}

@Component({
  imports: [...GROUP_IMPORTS],
  template: `
    <div forDropListGroup>
      <ul forDropList (dragDrop)="onDropA($event)">
        @for (row of rowsA(); track row.id) {
          <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">{{ row.label }}</li>
        }
      </ul>
      <ul forDropList disabled>
        @for (row of rowsB(); track row.id) {
          <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">{{ row.label }}</li>
        }
      </ul>
    </div>
  `,
})
class DisabledConnectedHost {
  readonly rowsA: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
  ]);
  readonly rowsB: WritableSignal<Row[]> = signal([{ id: 3, label: 'Gamma' }]);
  readonly lastDropA = signal<ForDragDropEvent | null>(null);
  onDropA(e: ForDragDropEvent): void {
    this.lastDropA.set(e);
  }
}

@Component({
  imports: [...HANDLE_IMPORTS],
  template: `
    <ul forDropList (dragDrop)="onDrop($event)">
      @for (row of rows(); track row.id) {
        <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
          @if (row.id === 1) {
            <span forDragHandle data-testid="handle-1" aria-hidden="true">::</span>
          }
          {{ row.label }}
        </li>
      }
    </ul>
  `,
})
class HandleHost {
  readonly rows: WritableSignal<Row[]> = signal([
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ]);
  readonly lastDrop = signal<ForDragDropEvent | null>(null);
  onDrop(event: ForDragDropEvent): void {
    this.lastDrop.set(event);
  }
}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul forDropList>
      <li forDraggable [dragData]="1" data-test-id="1">Alpha</li>
      <li forDraggable [dragData]="2" data-test-id="2" data-tab-stop>Beta</li>
      <li forDraggable [dragData]="3" data-test-id="3">Gamma</li>
    </ul>
  `,
  providers: [
    {
      provide: FOR_DROP_LIST_ROVING_DELEGATE,
      useValue: {
        itemTabindex: (el: HTMLElement) => (el.hasAttribute('data-tab-stop') ? 0 : -1),
      } satisfies ForDropListRovingDelegate,
    },
  ],
})
class DelegateGovernsHost {}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul forDropList>
      <li forDraggable [dragData]="1" data-test-id="1">Alpha</li>
      <li forDraggable [dragData]="2" data-test-id="2">Beta</li>
    </ul>
  `,
  providers: [
    {
      provide: FOR_DROP_LIST_ROVING_DELEGATE,
      useValue: { itemTabindex: () => null } satisfies ForDropListRovingDelegate,
    },
  ],
})
class DelegateDefersHost {}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul forDropList>
      <li forDraggable [dragData]="1" data-test-id="1">Alpha</li>
      <li forDraggable [dragData]="2" data-test-id="2" data-highlight>Beta</li>
      <li forDraggable [dragData]="3" data-test-id="3">Gamma</li>
    </ul>
  `,
  providers: [
    {
      provide: FOR_DROP_LIST_ROVING_DELEGATE,
      useValue: {
        itemTabindex: () => null,
        isItemHighlighted: (el: HTMLElement) => el.hasAttribute('data-highlight'),
      } satisfies ForDropListRovingDelegate,
    },
  ],
})
class DelegateHighlightHost {}

@Component({
  imports: [...DND_IMPORTS],
  template: `
    <ul forDropList>
      <li forDraggable [dragData]="1" data-test-id="1" data-no-enter>Alpha</li>
      <li forDraggable [dragData]="2" data-test-id="2">Beta</li>
    </ul>
  `,
  providers: [
    {
      provide: FOR_DRAGGABLE_LIFT_GUARD,
      useValue: {
        canLiftOnKey: (event: KeyboardEvent, host: HTMLElement) =>
          !(event.key === 'Enter' && host.hasAttribute('data-no-enter')),
      } satisfies ForDraggableLiftGuard,
    },
  ],
})
class LiftGuardHost {}

function itemEl(host: HTMLElement, testId: string | number): HTMLElement {
  return host.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;
}

function listEl(host: HTMLElement, index = 0): HTMLElement {
  return host.querySelectorAll<HTMLElement>('[forDropList]')[index]!;
}

describe('ForDropList + ForDraggable', () => {
  describe('orientation default', () => {
    it('a plain [forDropList] reflects data-orientation="vertical" with no binding', () => {
      const { el } = renderHost(TwoListGroupHost);
      const lists = el.querySelectorAll<HTMLElement>('[forDropList]');
      expect(lists).toHaveLength(2);
      lists.forEach((list) => expect(list.getAttribute('data-orientation')).toBe('vertical'));
    });
  });

  describe('registration and roving tabindex', () => {
    it('gives exactly one item tabindex="0" — the first enabled item', () => {
      const { el } = renderHost(SingleListHost);
      const items = el.querySelectorAll('[forDraggable]');
      const tabzeros = [...items].filter((i) => i.getAttribute('tabindex') === '0');
      expect(tabzeros).toHaveLength(1);
      expect(tabzeros[0]).toBe(items[0]);
    });

    it('moves roving focus on ArrowDown', () => {
      const { el } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, 'ArrowDown');
      expect(document.activeElement).toBe(itemEl(el, 2));
    });

    it('moves roving focus on ArrowUp', () => {
      const { el } = renderHost(SingleListHost);
      const second = itemEl(el, 2);
      second.focus();
      pressKey(second, 'ArrowUp');
      expect(document.activeElement).toBe(itemEl(el, 1));
    });

    it('jumps to first item on Home', () => {
      const { el } = renderHost(SingleListHost);
      const last = itemEl(el, 3);
      last.focus();
      pressKey(last, 'Home');
      expect(document.activeElement).toBe(itemEl(el, 1));
    });

    it('jumps to last item on End', () => {
      const { el } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, 'End');
      expect(document.activeElement).toBe(itemEl(el, 3));
    });

    it('skips disabled items during navigation', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.rows.set([
        { id: 1, label: 'Alpha' },
        { id: 2, label: 'Beta', disabled: true },
        { id: 3, label: 'Gamma' },
      ]);
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, 'ArrowDown');
      expect(document.activeElement).toBe(itemEl(el, 3));
    });

    it('disabled items have tabindex="-1", aria-disabled="true", and data-disabled', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.rows.set([
        { id: 1, label: 'Alpha', disabled: true },
        { id: 2, label: 'Beta' },
      ]);
      fixture.detectChanges();
      await flush(fixture);
      const d = itemEl(el, 1);
      expect(d.getAttribute('tabindex')).toBe('-1');
      expect(d.getAttribute('aria-disabled')).toBe('true');
      expect(d.hasAttribute('data-disabled')).toBe(true);
    });
  });

  describe('roving tabindex delegate (FOR_DROP_LIST_ROVING_DELEGATE)', () => {
    it('defers each item tabindex to the delegate when it governs the tab order', () => {
      const { el } = renderHost(DelegateGovernsHost);
      expect(itemEl(el, 1).getAttribute('tabindex')).toBe('-1');
      expect(itemEl(el, 2).getAttribute('tabindex')).toBe('0');
      expect(itemEl(el, 3).getAttribute('tabindex')).toBe('-1');
    });

    it('falls back to the list own roving (first enabled item) when the delegate returns null', () => {
      const { el } = renderHost(DelegateDefersHost);
      expect(itemEl(el, 1).getAttribute('tabindex')).toBe('0');
      expect(itemEl(el, 2).getAttribute('tabindex')).toBe('-1');
    });

    it('defers each item data-highlighted to the delegate when it governs highlight', () => {
      const { el } = renderHost(DelegateHighlightHost);
      expect(itemEl(el, 1).hasAttribute('data-highlighted')).toBe(false);
      expect(itemEl(el, 2).getAttribute('data-highlighted')).toBe('');
      expect(itemEl(el, 3).hasAttribute('data-highlighted')).toBe(false);
    });

    it('falls back to the list own roving highlight when the delegate omits isItemHighlighted', async () => {
      const { el, fixture } = renderHost(DelegateDefersHost);
      const first = itemEl(el, 1);
      first.focus();
      await flush(fixture);
      expect(first.getAttribute('data-highlighted')).toBe('');
      expect(itemEl(el, 2).hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('keyboard lift guard (FOR_DRAGGABLE_LIFT_GUARD)', () => {
    it('skips the lift for a key the guard rejects, leaving it to a co-located affordance', () => {
      const { el, fixture } = renderHost(LiftGuardHost);
      const guarded = itemEl(el, 1);
      guarded.focus();
      const event = pressKey(guarded, 'Enter');
      fixture.detectChanges();
      expect(guarded.hasAttribute('data-dragging')).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    });

    it('still lifts on a key the guard allows', () => {
      const { el, fixture } = renderHost(LiftGuardHost);
      const guarded = itemEl(el, 1);
      guarded.focus();
      const event = pressKey(guarded, ' ');
      fixture.detectChanges();
      expect(guarded.getAttribute('data-dragging')).toBe('');
      expect(event.defaultPrevented).toBe(true);
    });

    it('applies the guard per item host, so an unguarded item still lifts on the rejected key', () => {
      const { el, fixture } = renderHost(LiftGuardHost);
      const free = itemEl(el, 2);
      free.focus();
      pressKey(free, 'Enter');
      fixture.detectChanges();
      expect(free.getAttribute('data-dragging')).toBe('');
    });
  });

  describe('data-highlighted (roving-active item)', () => {
    it('is absent on every item until one is focused', () => {
      const { el } = renderHost(SingleListHost);
      el.querySelectorAll('[forDraggable]').forEach((item) =>
        expect(item.hasAttribute('data-highlighted')).toBe(false),
      );
    });

    it('reflects data-highlighted on the roving-active item and clears the previous one', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      await flush(fixture);
      expect(first.getAttribute('data-highlighted')).toBe('');

      pressKey(first, 'ArrowDown');
      await flush(fixture);
      const second = itemEl(el, 2);
      expect(second.getAttribute('data-highlighted')).toBe('');
      expect(first.hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('lift', () => {
    it('Space on an item sets data-dragging on the item and source list', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.hasAttribute('data-dragging')).toBe(true);
      expect(listEl(el).hasAttribute('data-dragging')).toBe(true);
    });

    it('Enter on an item also lifts', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, 'Enter');
      fixture.detectChanges();
      expect(first.hasAttribute('data-dragging')).toBe(true);
    });

    it('sets data-drag-over on the source list', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(listEl(el).hasAttribute('data-drag-over')).toBe(true);
    });
  });

  describe('keyboard reorder (same list)', () => {
    it('ArrowDown + Space drops item 0 at position 1', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousContainer).toBe(drop!.container);
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
      const reordered = moveItemInArray(comp.rows(), drop!.previousIndex, drop!.currentIndex);
      expect(reordered.map((r) => r.id)).toEqual([2, 1, 3]);
    });

    it('ArrowUp + Space drops item 2 at position 1', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const third = itemEl(el, 3);
      third.focus();
      pressKey(third, ' ');
      pressKey(third, 'ArrowUp');
      pressKey(third, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(2);
      expect(drop!.currentIndex).toBe(1);
    });

    it('dropping at the original position emits dragDrop with equal indices', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(0);
    });

    it('clears data-dragging and data-drag-over on drop', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(listEl(el).hasAttribute('data-dragging')).toBe(true);
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(listEl(el).hasAttribute('data-dragging')).toBe(false);
      expect(listEl(el).hasAttribute('data-drag-over')).toBe(false);
      expect(first.hasAttribute('data-dragging')).toBe(false);
    });

    it('End jumps the lifted item to the last position', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'End');
      pressKey(first, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(2);
      const reordered = moveItemInArray(comp.rows(), drop!.previousIndex, drop!.currentIndex);
      expect(reordered.map((r) => r.id)).toEqual([2, 3, 1]);
    });

    it('Home jumps the lifted item to the first position', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const third = itemEl(el, 3);
      third.focus();
      pressKey(third, ' ');
      pressKey(third, 'Home');
      pressKey(third, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(2);
      expect(drop!.currentIndex).toBe(0);
      const reordered = moveItemInArray(comp.rows(), drop!.previousIndex, drop!.currentIndex);
      expect(reordered.map((r) => r.id)).toEqual([3, 1, 2]);
    });
  });

  describe('cross-list transfer (forDropListGroup)', () => {
    it('moving to list B emits dragDrop with the right containers and indices', () => {
      const { el, fixture } = renderHost(TwoListGroupHost);
      const comp = fixture.componentInstance;
      const firstA = itemEl(el, 'a-1');
      firstA.focus();
      pressKey(firstA, ' ');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, ' ');
      const drop = comp.lastDropA();
      const listAEl = listEl(el, 0);
      const listBEl = listEl(el, 1);
      expect(drop!.previousContainer.host).toBe(listAEl);
      expect(drop!.container.host).toBe(listBEl);
      expect(drop!.previousIndex).toBe(0);
    });

    it('list B shows data-drag-over while being targeted', () => {
      const { el, fixture } = renderHost(TwoListGroupHost);
      const firstA = itemEl(el, 'a-1');
      firstA.focus();
      pressKey(firstA, ' ');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      fixture.detectChanges();
      const listBEl = listEl(el, 1);
      expect(listBEl.hasAttribute('data-drag-over')).toBe(true);
    });

    it('data-drag-over clears from list B after drop', () => {
      const { el, fixture } = renderHost(TwoListGroupHost);
      const firstA = itemEl(el, 'a-1');
      firstA.focus();
      pressKey(firstA, ' ');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, ' ');
      fixture.detectChanges();
      const listBEl = listEl(el, 1);
      expect(listBEl.hasAttribute('data-drag-over')).toBe(false);
    });
  });

  describe('cross-list transfer ([connectedTo])', () => {
    it('emits dragDrop across lists wired with [connectedTo]', () => {
      const { el, fixture } = renderHost(TwoListConnectedHost);
      const comp = fixture.componentInstance;
      const firstA = itemEl(el, 'a-1');
      firstA.focus();
      pressKey(firstA, ' ');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, ' ');
      const drop = comp.lastDropA();
      const listBEl = listEl(el, 1);
      expect(drop!.container.host).toBe(listBEl);
    });
  });

  describe('cancel', () => {
    it('Escape cancels the drag — no dragDrop, data-dragging and data-drag-over cleared', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const item1 = itemEl(el, 1);
      item1.focus();
      pressKey(item1, ' ');
      fixture.detectChanges();
      expect(item1.hasAttribute('data-dragging')).toBe(true);
      pressKey(item1, 'ArrowDown');
      pressKey(item1, 'Escape');
      fixture.detectChanges();
      expect(comp.lastDrop()).toBeNull();
      expect(item1.hasAttribute('data-dragging')).toBe(false);
      expect(listEl(el).hasAttribute('data-drag-over')).toBe(false);
    });

    it('Escape while keyboard-lifted does not propagate to an enclosing dismissible layer', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const item1 = itemEl(el, 1);

      let ancestorSaw = false;
      const ancestor = (): void => {
        ancestorSaw = true;
      };
      document.addEventListener('keydown', ancestor);
      try {
        item1.focus();
        pressKey(item1, ' ');
        fixture.detectChanges();
        expect(item1.hasAttribute('data-dragging')).toBe(true);

        ancestorSaw = false;
        const escape = pressKey(item1, 'Escape');
        fixture.detectChanges();

        expect(comp.lastDrop()).toBeNull();
        expect(item1.hasAttribute('data-dragging')).toBe(false);
        expect(escape.defaultPrevented).toBe(true);
        expect(ancestorSaw).toBe(false);
      } finally {
        document.removeEventListener('keydown', ancestor);
      }
    });

    it('blurring a lifted item cancels the drag — no dragDrop, state cleared', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const item1 = itemEl(el, 1);
      item1.focus();
      pressKey(item1, ' ');
      fixture.detectChanges();
      expect(item1.hasAttribute('data-dragging')).toBe(true);
      item1.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(comp.lastDrop()).toBeNull();
      expect(item1.hasAttribute('data-dragging')).toBe(false);
      expect(listEl(el).hasAttribute('data-drag-over')).toBe(false);
    });

    it('Escape cancels an in-flight pointer drag — no dragDrop, the trailing pointerup is inert', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      const opts = {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
        pointerType: 'mouse',
      };

      first.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: 0, clientY: 0 }));
      first.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: 20, clientY: 0 }));
      fixture.detectChanges();
      expect(first.hasAttribute('data-dragging')).toBe(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(comp.lastDrop()).toBeNull();
      expect(first.hasAttribute('data-dragging')).toBe(false);

      first.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: 20, clientY: 0 }));
      fixture.detectChanges();
      expect(comp.lastDrop()).toBeNull();
    });
  });

  describe('disabled list', () => {
    it('items in a disabled list cannot be lifted', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      comp.listDisabled.set(true);
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(listEl(el).hasAttribute('data-dragging')).toBe(false);
    });

    it('disabled list reflects data-disabled', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.listDisabled.set(true);
      fixture.detectChanges();
      await flush(fixture);
      expect(listEl(el).hasAttribute('data-disabled')).toBe(true);
    });

    it('disabled connected list is not a transfer target', () => {
      const { el, fixture } = renderHost(DisabledConnectedHost);
      const comp = fixture.componentInstance;
      const firstA = itemEl(el, 'a-1');
      firstA.focus();
      pressKey(firstA, ' ');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, 'ArrowDown');
      pressKey(firstA, ' ');
      const drop = comp.lastDropA();
      expect(drop!.container.host).toBe(listEl(el, 0));
      expect(drop!.previousContainer.host).toBe(listEl(el, 0));
    });
  });

  describe('RTL axis', () => {
    it('ArrowLeft moves "next" in horizontal RTL', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      comp.orientation.set('horizontal');
      comp.dir.set('rtl');
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, 'ArrowLeft');
      expect(document.activeElement).toBe(itemEl(el, 2));
    });

    it('resolves the host dir attribute to "rtl"', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.dir.set('rtl');
      fixture.detectChanges();
      await flush(fixture);
      expect(listEl(el).getAttribute('dir')).toBe('rtl');
    });
  });

  describe('mixed orientation', () => {
    it('reflects data-orientation="mixed" on the list host', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.orientation.set('mixed');
      fixture.detectChanges();
      await flush(fixture);
      expect(listEl(el).getAttribute('data-orientation')).toBe('mixed');
    });

    it('ArrowRight steps the lifted item in mixed mode (vertical would ignore it)', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      comp.orientation.set('mixed');
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowRight');
      pressKey(first, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });

    it('zoneless: mixed lift → ArrowDown move → drop commits correct indices', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.componentInstance.orientation.set('mixed');
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });
  });

  describe('announcements', () => {
    afterEach(() => {
      vi.useRealTimers();
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('announces lift via aria-live region', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="assertive"]') as HTMLElement | null;
      expect(region?.textContent).toContain('lifted');
    });

    it('announces cancel via aria-live region', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'Escape');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="assertive"]') as HTMLElement | null;
      expect(region?.textContent).toContain('cancelled');
    });

    it('uses overridden announcement from provideForDragDropDefaults', () => {
      vi.useFakeTimers();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideForDragDropDefaults({ announceLift: () => 'CUSTOM_LIFT' }),
        ],
      });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.detectChanges();
      const item = fixture.nativeElement.querySelector('[data-test-id="1"]') as HTMLElement;
      item.focus();
      pressKey(item, ' ');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="assertive"]') as HTMLElement | null;
      expect(region?.textContent).toBe('CUSTOM_LIFT');
    });

    @Component({
      imports: [...DND_IMPORTS],
      template: `
        <ul forDropList #listA="forDropList" [connectedTo]="[listB]">
          @for (row of rowsA(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">
              {{ row.label }}
            </li>
          }
        </ul>
        <ul forDropList #listB="forDropList" [connectedTo]="[listA]">
          @for (row of rowsB(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">
              {{ row.label }}
            </li>
          }
        </ul>
      `,
    })
    class EmptyTargetConnectedHost {
      readonly rowsA: WritableSignal<Row[]> = signal([
        { id: 1, label: 'Alpha' },
        { id: 2, label: 'Beta' },
      ]);
      readonly rowsB: WritableSignal<Row[]> = signal<Row[]>([]);
    }

    it('announces a cross-list move total as the target insertion-position count, not its item count', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(TwoListConnectedHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="polite"]') as HTMLElement | null;
      expect(region?.textContent).toContain('moved to position 2 of 2');
      expect(region?.textContent).not.toContain('of 1');
    });

    it('announces a cross-list drop total as the target insertion-position count', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(TwoListConnectedHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="assertive"]') as HTMLElement | null;
      expect(region?.textContent).toContain('dropped at position 2 of 2');
    });

    it('announces position 1 of 1 when the transfer target is empty', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(EmptyTargetConnectedHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="polite"]') as HTMLElement | null;
      expect(region?.textContent).toContain('moved to position 1 of 1');
      expect(region?.textContent).not.toContain('of 0');
    });

    it('leaves the same-list move total at the source item count', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(TwoListConnectedHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="polite"]') as HTMLElement | null;
      expect(region?.textContent).toContain('moved to position 2 of 2');
      expect(region?.textContent).not.toContain('of 3');
    });

    it('leaves the lift total at the source item count', () => {
      vi.useFakeTimers();
      const { el, fixture } = renderHost(TwoListConnectedHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      vi.runAllTimers();
      fixture.detectChanges();
      const region = document.querySelector('[aria-live="assertive"]') as HTMLElement | null;
      expect(region?.textContent).toContain('lifted. 1 of 2');
    });
  });

  describe('zoneless', () => {
    it('lift → move → drop round-trip works under provideZonelessChangeDetection', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
      expect(drop!.item).toEqual({ id: 1, label: 'Alpha' });
    });
  });

  describe('[boundary] / [lockAxis]', () => {
    @Component({
      imports: [...DND_IMPORTS],
      template: `
        <ul forDropList #list="forDropList" lockAxis="x" (dragDrop)="onDrop($event)">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">{{ row.label }}</li>
          }
        </ul>
      `,
    })
    class LockAxisHost {
      readonly rows: WritableSignal<Row[]> = signal([
        { id: 1, label: 'Alpha' },
        { id: 2, label: 'Beta' },
        { id: 3, label: 'Gamma' },
      ]);
      readonly listRef = viewChild.required<ForDropList>('list');
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
      }
    }

    it('pointer lift → move → drop with lockAxis="x" completes under provideZonelessChangeDetection', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LockAxisHost);
      fixture.detectChanges();
      await flush(fixture);
      const comp = fixture.componentInstance;
      const list = comp.listRef();
      const el = fixture.nativeElement as HTMLElement;
      const first = itemEl(el, 1);
      list.pointerLift(first, { x: 10, y: 10 });
      fixture.detectChanges();
      list.pointerMove({ x: 50, y: 200 });
      fixture.detectChanges();
      list.drop();
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
    });
  });

  describe('pointer-move coalescing', () => {
    @Component({
      imports: [...DND_IMPORTS],
      template: `
        <ul forDropList #list="forDropList" [autoScroll]="false" (dragDrop)="onDrop($event)">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">{{ row.label }}</li>
          }
        </ul>
      `,
    })
    class CoalesceHost {
      readonly rows: WritableSignal<Row[]> = signal([
        { id: 1, label: 'Alpha' },
        { id: 2, label: 'Beta' },
        { id: 3, label: 'Gamma' },
      ]);
      readonly listRef = viewChild.required<ForDropList>('list');
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
      }
    }

    it('collapses a burst of pointer moves into one trailing frame and flushes it on drop', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(CoalesceHost);
      fixture.detectChanges();
      await flush(fixture);
      const comp = fixture.componentInstance;
      const list = comp.listRef();
      const el = fixture.nativeElement as HTMLElement;
      const first = itemEl(el, 1);

      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      list.pointerLift(first, { x: 0, y: 0 });
      list.pointerMove({ x: 0, y: 10 });
      const framesAfterFirstMove = rafSpy.mock.results.length;
      const coalescedFrame = rafSpy.mock.results.at(-1)!.value as number;
      list.pointerMove({ x: 0, y: 20 });
      list.pointerMove({ x: 0, y: 200 });

      expect(rafSpy.mock.results.length).toBe(framesAfterFirstMove);

      fixture.detectChanges();
      const cancelsBefore = cancelSpy.mock.calls.length;
      list.drop();
      const cancelledDuringDrop = cancelSpy.mock.calls.slice(cancelsBefore).map((c) => c[0]);
      fixture.detectChanges();

      expect(cancelledDuringDrop).toContain(coalescedFrame);
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(listEl(el).hasAttribute('data-dragging')).toBe(false);
    });
  });

  describe('[forDragHandle]', () => {
    it('renders data-drag-handle attribute and touch-action: none on the handle element', () => {
      const { el } = renderHost(HandleHost);
      const handle = el.querySelector('[forDragHandle]') as HTMLElement;
      expect(handle).not.toBeNull();
      expect(handle.hasAttribute('data-drag-handle')).toBe(true);
      expect(handle.style.touchAction).toBe('none');
    });

    it('an item with a handle does not set touch-action: none on its own host', () => {
      const { el } = renderHost(HandleHost);
      const itemWithHandle = itemEl(el, 1);
      expect(itemWithHandle.style.touchAction).not.toBe('none');
    });

    it('an item without a handle sets touch-action: none on its host', () => {
      const { el } = renderHost(HandleHost);
      const itemWithoutHandle = itemEl(el, 2);
      expect(itemWithoutHandle.style.touchAction).toBe('none');
    });

    it('keyboard lift/drop still works when a handle is present (handle does not break keyboard model)', () => {
      const { el, fixture } = renderHost(HandleHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });

    it('keyboard lift/drop works under provideZonelessChangeDetection with a handle present', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(HandleHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });
  });

  describe('[forDragPreview] / [forDragPlaceholder]', () => {
    interface TplRow {
      id: number;
      label: string;
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPreview, ForDragPlaceholder],
      template: `
        <ul forDropList (dragDrop)="onDrop($event)">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
              {{ row.label }}
              <ng-template forDragPreview
                ><span class="cp">preview {{ row.label }}</span></ng-template
              >
              <ng-template forDragPlaceholder><span class="ph">gap</span></ng-template>
            </li>
          }
        </ul>
      `,
    })
    class TemplatesHost {
      readonly rows: WritableSignal<TplRow[]> = signal([
        { id: 1, label: 'Alpha' },
        { id: 2, label: 'Beta' },
        { id: 3, label: 'Gamma' },
      ]);
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
      }
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPreview, ForDragPlaceholder],
      template: `
        <ul forDropList>
          <li forDraggable [dragData]="'x'">
            x
            <ng-template forDragPreview #tplPreview="forDragPreview"><span>prev</span></ng-template>
            <ng-template forDragPlaceholder #tplPlaceholder="forDragPlaceholder"
              ><span>gap</span></ng-template
            >
          </li>
        </ul>
      `,
    })
    class StaticTemplatesHost {
      readonly previewRef = viewChild.required<ForDragPreview>('tplPreview');
      readonly placeholderRef = viewChild.required<ForDragPlaceholder>('tplPlaceholder');
    }

    @Component({
      imports: [ForDragPreview],
      template: `<ng-template forDragPreview></ng-template>`,
    })
    class OrphanPreviewHost {}

    @Component({
      imports: [ForDragPlaceholder],
      template: `<ng-template forDragPlaceholder></ng-template>`,
    })
    class OrphanPlaceholderHost {}

    it('ForDragPreview exposes a defined templateRef', () => {
      const { fixture } = renderHost(StaticTemplatesHost);
      expect(fixture.componentInstance.previewRef().templateRef).toBeTruthy();
    });

    it('ForDragPlaceholder exposes a defined templateRef', () => {
      const { fixture } = renderHost(StaticTemplatesHost);
      expect(fixture.componentInstance.placeholderRef().templateRef).toBeTruthy();
    });

    it('ForDragPreview outside [forDraggable] throws the orphan error', () => {
      expect(() => renderHost(OrphanPreviewHost)).toThrow(
        '[forty-cdk/drag-drop] ForDragPreview must be used inside a [forDraggable] or [forFreeDrag] element.',
      );
    });

    it('ForDragPlaceholder outside [forDraggable] throws the orphan error', () => {
      expect(() => renderHost(OrphanPlaceholderHost)).toThrow(
        '[forty-cdk/drag-drop] ForDragPlaceholder must be used inside a [forDraggable] or [forFreeDrag] element.',
      );
    });

    it('keyboard lift/drop with templates present emits correct indices and never hides the host', () => {
      const { el, fixture } = renderHost(TemplatesHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      expect(first.style.display).not.toBe('none');
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });

    it('keyboard lift/drop with templates works under provideZonelessChangeDetection', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TemplatesHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });
  });

  describe('animateReorder', () => {
    it('default off: keyboard reorder emits dragDrop and no item gains data-drag-animating', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop).not.toBeNull();
      const animating = el.querySelectorAll('[data-drag-animating]');
      expect(animating.length).toBe(0);
    });

    it('on + zoneless: keyboard reorder commits correct indices and flush completes without error', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.componentInstance.animate.set(true);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      await flush(fixture);
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });

    describe('reduced motion', () => {
      let restore: () => void;
      beforeEach(() => {
        restore = withReducedMotion();
      });
      afterEach(() => {
        restore();
      });

      it('skips animation under prefers-reduced-motion: no data-drag-animating appears', () => {
        const { el, fixture } = renderHost(SingleListHost);
        const comp = fixture.componentInstance;
        comp.animate.set(true);
        fixture.detectChanges();
        const first = itemEl(el, 1);
        first.focus();
        pressKey(first, ' ');
        pressKey(first, 'ArrowDown');
        pressKey(first, ' ');
        fixture.detectChanges();
        const drop = comp.lastDrop();
        expect(drop).not.toBeNull();
        const animating = el.querySelectorAll('[data-drag-animating]');
        expect(animating.length).toBe(0);
      });
    });
  });

  describe('[liveSort]', () => {
    interface TplRow {
      id: number;
      label: string;
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPreview, ForDragPlaceholder],
      template: `
        <ul forDropList [liveSort]="liveSort()" (dragDrop)="onDrop($event)">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
              {{ row.label }}
              <ng-template forDragPreview
                ><span class="cp">preview {{ row.label }}</span></ng-template
              >
              <ng-template forDragPlaceholder><span class="ph">gap</span></ng-template>
            </li>
          }
        </ul>
      `,
    })
    class LiveSortHost {
      readonly liveSort = signal(true);
      readonly rows: WritableSignal<TplRow[]> = signal([
        { id: 1, label: 'Alpha' },
        { id: 2, label: 'Beta' },
        { id: 3, label: 'Gamma' },
      ]);
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
      }
    }

    it('keyboard lift/drop with liveSort=true emits correct indices and never hides the host', () => {
      const { el, fixture } = renderHost(LiveSortHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      expect(first.style.display).not.toBe('none');
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });

    it('keyboard lift/drop with liveSort=false (default) also never hides the host', async () => {
      const { el, fixture } = renderHost(LiveSortHost);
      const comp = fixture.componentInstance;
      comp.liveSort.set(false);
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      expect(first.style.display).not.toBe('none');
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });

    it('zoneless: keyboard lift → move → drop on liveSort list commits correct indices', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LiveSortHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(1);
    });
  });

  describe('synthetic click suppression after pointer drag', () => {
    function firePointer(
      target: HTMLElement,
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          button: 0,
          pointerType: 'mouse',
        }),
      );
    }

    it('cancels the trailing click on the dragged item after a committed pointer drag', () => {
      const { el } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      const hostClick = vi.fn();
      first.addEventListener('click', hostClick);
      try {
        firePointer(first, 'pointerdown', 0, 0);
        firePointer(first, 'pointermove', 20, 0);
        firePointer(first, 'pointerup', 20, 0);

        const click = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 20,
          clientY: 0,
        });
        first.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(hostClick).not.toHaveBeenCalled();
      } finally {
        first.removeEventListener('click', hostClick);
      }
    });

    it('suppresses only the first click — a later click activates the host normally', () => {
      const { el } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      const hostClick = vi.fn();
      first.addEventListener('click', hostClick);
      try {
        firePointer(first, 'pointerdown', 0, 0);
        firePointer(first, 'pointermove', 20, 0);
        firePointer(first, 'pointerup', 20, 0);

        first.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 20, clientY: 0 }),
        );
        expect(hostClick).not.toHaveBeenCalled();

        const second = new MouseEvent('click', { bubbles: true, cancelable: true });
        first.dispatchEvent(second);
        expect(second.defaultPrevented).toBe(false);
        expect(hostClick).toHaveBeenCalledTimes(1);
      } finally {
        first.removeEventListener('click', hostClick);
      }
    });

    it('does not suppress a plain click (no movement past the drag threshold)', () => {
      const { el } = renderHost(SingleListHost);
      const first = itemEl(el, 1);
      const hostClick = vi.fn();
      first.addEventListener('click', hostClick);
      try {
        firePointer(first, 'pointerdown', 0, 0);
        firePointer(first, 'pointerup', 0, 0);

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        first.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(false);
        expect(hostClick).toHaveBeenCalledTimes(1);
      } finally {
        first.removeEventListener('click', hostClick);
      }
    });

    it('cancels the trailing click under provideZonelessChangeDetection', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const first = itemEl(el, 1);
      const hostClick = vi.fn();
      first.addEventListener('click', hostClick);
      try {
        firePointer(first, 'pointerdown', 0, 0);
        firePointer(first, 'pointermove', 20, 0);
        firePointer(first, 'pointerup', 20, 0);

        const click = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 20,
          clientY: 0,
        });
        first.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(hostClick).not.toHaveBeenCalled();
      } finally {
        first.removeEventListener('click', hostClick);
      }
    });
  });

  describe('destroy mid-drag', () => {
    function firePointer(
      target: HTMLElement,
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          button: 0,
          pointerType: 'mouse',
        }),
      );
    }

    it('removing the lifted item mid-pointer-drag resets the list, drops the preview, and a later lift still works', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 0, 0);
      firePointer(first, 'pointermove', 20, 0);
      fixture.detectChanges();
      expect(first.hasAttribute('data-dragging')).toBe(true);
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(1);

      comp.rows.set([
        { id: 2, label: 'Beta' },
        { id: 3, label: 'Gamma' },
      ]);
      fixture.detectChanges();
      await flush(fixture);

      expect(listEl(el).hasAttribute('data-dragging')).toBe(false);
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(0);

      const second = itemEl(el, 2);
      second.focus();
      pressKey(second, ' ');
      fixture.detectChanges();
      expect(second.hasAttribute('data-dragging')).toBe(true);
      expect(listEl(el).hasAttribute('data-dragging')).toBe(true);
    });

    afterEach(() => {
      document.querySelectorAll('[data-for-drag-preview]').forEach((node) => node.remove());
    });

    it('destroying the whole list mid-pointer-drag removes the floating preview from document.body', () => {
      const { el, fixture } = renderHost(SingleListHost);
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 0, 0);
      firePointer(first, 'pointermove', 20, 0);
      fixture.detectChanges();
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(1);

      fixture.destroy();

      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(0);
    });

    it('destroying the list before an animated drop renders removes the handed-off preview from document.body', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.animate.set(true);
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 0, 0);
      firePointer(first, 'pointermove', 20, 0);
      fixture.detectChanges();
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(1);

      firePointer(first, 'pointerup', 20, 0);
      fixture.destroy();

      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(0);
      await nextMacrotask();
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(0);
    });

    it('an animated drop still removes the preview once the settle render runs', async () => {
      const { el, fixture } = renderHost(SingleListHost);
      fixture.componentInstance.animate.set(true);
      fixture.detectChanges();
      await flush(fixture);
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 0, 0);
      firePointer(first, 'pointermove', 20, 0);
      fixture.detectChanges();
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(1);

      firePointer(first, 'pointerup', 20, 0);
      await flush(fixture);

      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(0);
    });

    it('zoneless: removing the lifted item mid-pointer-drag resets the list and drops the preview', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 0, 0);
      firePointer(first, 'pointermove', 20, 0);
      fixture.detectChanges();
      expect(first.hasAttribute('data-dragging')).toBe(true);
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(1);

      comp.rows.set([
        { id: 2, label: 'Beta' },
        { id: 3, label: 'Gamma' },
      ]);
      fixture.detectChanges();
      await flush(fixture);

      expect(listEl(el).hasAttribute('data-dragging')).toBe(false);
      expect(document.querySelectorAll('[data-for-drag-preview]')).toHaveLength(0);
    });
  });

  describe('focus after a committed keyboard drop', () => {
    function firePointer(
      target: HTMLElement,
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          button: 0,
          pointerType: 'mouse',
        }),
      );
    }

    afterEach(() => {
      document.querySelectorAll('[data-for-drag-preview]').forEach((node) => node.remove());
    });

    it('a cross-list keyboard drop focuses the transferred item in the target list', async () => {
      const { el, fixture } = renderHost(AppliedMoveHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      await flush(fixture);

      const transferred = itemEl(el, 'b-1');
      expect(listEl(el, 1).contains(transferred)).toBe(true);
      expect(document.activeElement).toBe(transferred);
    });

    it('a same-list keyboard drop keeps focus on the moved item at its new index', async () => {
      const { el, fixture } = renderHost(AppliedMoveHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      await flush(fixture);

      const moved = itemEl(el, 'a-1');
      expect(listEl(el, 0).querySelectorAll('[forDraggable]')[1]).toBe(moved);
      expect(document.activeElement).toBe(moved);
    });

    it('leaves focus where the consumer put it inside the drop handler', async () => {
      const { el, fixture, instance } = renderHost(AppliedMoveHost);
      instance.focusOutsideOnDrop.set(true);
      fixture.detectChanges();
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      await flush(fixture);

      expect(document.activeElement).toBe(el.querySelector('[data-test-id="outside"]'));
    });

    it('does not move focus when the consumer leaves the item where it was', async () => {
      const { el, fixture } = renderHost(TwoListGroupHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      await flush(fixture);

      expect(document.activeElement).toBe(itemEl(el, 'a-1'));
    });

    it('does not move focus after a pointer drop', async () => {
      const { el, fixture } = renderHost(RemoveOnDropHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      expect(document.activeElement).toBe(first);

      firePointer(first, 'pointerdown', 0, 0);
      firePointer(first, 'pointermove', 20, 0);
      fixture.detectChanges();
      firePointer(first, 'pointerup', 20, 0);
      await flush(fixture);

      expect(el.querySelectorAll('[forDraggable]')).toHaveLength(2);
      expect(document.activeElement).toBe(document.body);
    });

    it('focuses the nearest remaining item when the target renders fewer items than the drop index', async () => {
      const { el, fixture } = renderHost(RemoveOnDropHost);
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, ' ');
      await flush(fixture);

      expect(el.querySelectorAll('[forDraggable]')).toHaveLength(2);
      expect(document.activeElement).toBe(itemEl(el, 'a-3'));
    });

    it('zoneless: a cross-list keyboard drop focuses the transferred item', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AppliedMoveHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const first = itemEl(el, 'a-1');
      first.focus();
      pressKey(first, ' ');
      fixture.detectChanges();
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      pressKey(first, 'ArrowDown');
      fixture.detectChanges();
      pressKey(first, ' ');
      fixture.detectChanges();
      await flush(fixture);

      expect(document.activeElement).toBe(itemEl(el, 'b-1'));
    });
  });

  describe('geometry caching (#1153)', () => {
    interface StubbedRect {
      el: HTMLElement;
      calls: () => number;
    }

    function stubRect(
      el: HTMLElement,
      rect: { left: number; top: number; right: number; bottom: number },
      counter: { n: number },
    ): StubbedRect {
      const value: DOMRect = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
        x: rect.left,
        y: rect.top,
        toJSON() {},
      };
      el.getBoundingClientRect = () => {
        counter.n++;
        return value;
      };
      return { el, calls: () => counter.n };
    }

    function layout(el: HTMLElement, counter: { n: number }): void {
      const list = el.querySelector<HTMLElement>('[forDropList]')!;
      stubRect(list, { left: 0, top: 0, right: 200, bottom: 240 }, counter);
      const items = list.querySelectorAll<HTMLElement>('[forDraggable]');
      items.forEach((item, i) => {
        stubRect(item, { left: 0, top: i * 20, right: 200, bottom: i * 20 + 20 }, counter);
      });
    }

    function layoutConnected(
      el: HTMLElement,
      counterA: { n: number },
      counterB: { n: number },
    ): void {
      const lists = el.querySelectorAll<HTMLElement>('[forDropList]');
      const listA = lists[0]!;
      const listB = lists[1]!;
      stubRect(listA, { left: 0, top: 0, right: 200, bottom: 240 }, counterA);
      const itemsA = listA.querySelectorAll<HTMLElement>('[forDraggable]');
      itemsA.forEach((item, i) => {
        stubRect(item, { left: 0, top: i * 20, right: 200, bottom: i * 20 + 20 }, counterA);
      });
      stubRect(listB, { left: 300, top: 0, right: 500, bottom: 240 }, counterB);
      const itemsB = listB.querySelectorAll<HTMLElement>('[forDraggable]');
      itemsB.forEach((item, i) => {
        stubRect(item, { left: 300, top: i * 20, right: 500, bottom: i * 20 + 20 }, counterB);
      });
    }

    @Component({
      imports: [...DND_IMPORTS],
      template: `
        <ul
          forDropList
          #listA="forDropList"
          [autoScroll]="false"
          [connectedTo]="[listB]"
          (dragDrop)="onDropA($event)"
        >
          @for (row of rowsA(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">
              {{ row.label }}
            </li>
          }
        </ul>
        <ul
          forDropList
          #listB="forDropList"
          [autoScroll]="false"
          [connectedTo]="[listA]"
          (dragDrop)="onDropB($event)"
        >
          @for (row of rowsB(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">
              {{ row.label }}
            </li>
          }
        </ul>
      `,
    })
    class ConnectedPerfHost {
      readonly listRefA = viewChild.required<ForDropList>('listA');
      readonly rowsA: WritableSignal<Row[]> = signal(
        Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: `A${i + 1}` })),
      );
      readonly rowsB: WritableSignal<Row[]> = signal(
        Array.from({ length: 4 }, (_, i) => ({ id: i + 1, label: `B${i + 1}` })),
      );
      readonly lastDropA = signal<ForDragDropEvent | null>(null);
      readonly lastDropB = signal<ForDragDropEvent | null>(null);
      onDropA(e: ForDragDropEvent): void {
        this.lastDropA.set(e);
      }
      onDropB(e: ForDragDropEvent): void {
        this.lastDropB.set(e);
      }
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPlaceholder],
      template: `
        <ul
          forDropList
          #list="forDropList"
          [autoScroll]="false"
          liveSort
          (dragDrop)="onDrop($event)"
        >
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
              {{ row.label }}
              <ng-template forDragPlaceholder><span class="ph">gap</span></ng-template>
            </li>
          }
        </ul>
      `,
    })
    class LiveSortPerfHost {
      readonly listRef = viewChild.required<ForDropList>('list');
      readonly rows: WritableSignal<Row[]> = signal(
        Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` })),
      );
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
      }
    }

    function makeRaf(pending: { cb: FrameRequestCallback | null }) {
      const raf = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          pending.cb = cb;
          return 1;
        });
      const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
        pending.cb = null;
      });
      return { raf, cancel };
    }

    function runFrame(pending: { cb: FrameRequestCallback | null }): void {
      const cb = pending.cb;
      pending.cb = null;
      cb?.(performance.now());
    }

    afterEach(() => {
      vi.useRealTimers();
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('reads at most O(containers) rects per frame after lift — not O(items)', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ConnectedPerfHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const counterA = { n: 0 };
      const counterB = { n: 0 };
      layoutConnected(el, counterA, counterB);
      const list = fixture.componentInstance.listRefA();
      const first = itemEl(el, 'a-1');

      const pending: { cb: FrameRequestCallback | null } = { cb: null };
      makeRaf(pending);

      list.pointerLift(first, { x: 100, y: 10 });
      const readsAtLift = counterA.n + counterB.n;
      expect(readsAtLift).toBeGreaterThan(0);

      const containerCount = 2;
      for (let step = 0; step < 5; step++) {
        const before = counterA.n + counterB.n;
        list.pointerMove({ x: 100, y: 30 + step * 10 });
        runFrame(pending);
        const perFrame = counterA.n + counterB.n - before;
        expect(perFrame).toBeLessThanOrEqual(2 * containerCount);
      }
    });

    it('does not re-read every item rect on a pure auto-scroll-style frame (liveSort off)', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.componentInstance.rows.set(
        Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` })),
      );
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const counter = { n: 0 };
      layout(el, counter);
      const first = itemEl(el, 1);

      const ref = fixture.debugElement.children[0]!.injector.get(ForDropList);

      const pending: { cb: FrameRequestCallback | null } = { cb: null };
      makeRaf(pending);

      ref.pointerLift(first, { x: 100, y: 10 });
      ref.pointerMove({ x: 100, y: 30 });
      runFrame(pending);
      const readsAfterFirstFrame = counter.n;

      ref.pointerMove({ x: 100, y: 40 });
      runFrame(pending);
      const readsSecondFrame = counter.n - readsAfterFirstFrame;

      expect(readsSecondFrame).toBeLessThanOrEqual(2);
    });

    it('keeps the lift-time item rects after the liveSort placeholder moves', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LiveSortPerfHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const counter = { n: 0 };
      layout(el, counter);
      const list = fixture.componentInstance.listRef();
      const first = itemEl(el, 1);

      const pending: { cb: FrameRequestCallback | null } = { cb: null };
      makeRaf(pending);

      list.pointerLift(first, { x: 100, y: 10 });
      list.pointerMove({ x: 100, y: 210 });
      runFrame(pending);
      const beforeReMeasure = counter.n;
      list.pointerMove({ x: 100, y: 50 });
      runFrame(pending);
      const afterReMeasure = counter.n - beforeReMeasure;

      expect(afterReMeasure).toBeLessThanOrEqual(2);
    });

    it('resolves the same drop index across cached frames as a fresh measure would', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(SingleListHost);
      fixture.componentInstance.rows.set(
        Array.from({ length: 6 }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` })),
      );
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const counter = { n: 0 };
      layout(el, counter);
      const ref = fixture.debugElement.children[0]!.injector.get(ForDropList);
      const comp = fixture.componentInstance;
      const first = itemEl(el, 1);

      const pending: { cb: FrameRequestCallback | null } = { cb: null };
      makeRaf(pending);

      ref.pointerLift(first, { x: 100, y: 10 });
      ref.pointerMove({ x: 100, y: 95 });
      runFrame(pending);
      ref.pointerMove({ x: 100, y: 95 });
      runFrame(pending);
      ref.drop();
      fixture.detectChanges();

      const drop = comp.lastDrop();
      expect(drop!.previousIndex).toBe(0);
      expect(drop!.currentIndex).toBe(4);
    });

    it('resolves cross-list transfer from cached geometry after lift', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ConnectedPerfHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const counterA = { n: 0 };
      const counterB = { n: 0 };
      layoutConnected(el, counterA, counterB);
      const list = fixture.componentInstance.listRefA();
      const comp = fixture.componentInstance;
      const first = itemEl(el, 'a-1');

      const pending: { cb: FrameRequestCallback | null } = { cb: null };
      makeRaf(pending);

      list.pointerLift(first, { x: 100, y: 10 });
      list.pointerMove({ x: 400, y: 15 });
      runFrame(pending);
      list.pointerMove({ x: 400, y: 15 });
      runFrame(pending);
      list.drop();
      fixture.detectChanges();

      const drop = comp.lastDropA();
      expect(drop!.previousContainer.host).toBe(listEl(el, 0));
      expect(drop!.container.host).toBe(listEl(el, 1));
      expect(drop!.currentIndex).toBe(1);
    });

    it('announces the pointer-resolved cross-list total as the target insertion-position count', async () => {
      vi.useFakeTimers();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(ConnectedPerfHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const counterA = { n: 0 };
      const counterB = { n: 0 };
      layoutConnected(el, counterA, counterB);
      const list = fixture.componentInstance.listRefA();

      const pending: { cb: FrameRequestCallback | null } = { cb: null };
      makeRaf(pending);

      list.pointerLift(itemEl(el, 'a-1'), { x: 100, y: 10 });
      list.pointerMove({ x: 400, y: 100 });
      runFrame(pending);
      vi.runAllTimers();
      fixture.detectChanges();

      const region = document.querySelector('[aria-live="polite"]') as HTMLElement | null;
      expect(region?.textContent).toContain('moved to position 5 of 5');
      expect(region?.textContent).not.toContain('of 4');
    });

    describe('per-container drop axis', () => {
      @Component({
        imports: [...DND_IMPORTS],
        template: `
          <ul
            forDropList
            #listA="forDropList"
            [autoScroll]="false"
            [connectedTo]="[listB]"
            (dragDrop)="onDropA($event)"
          >
            @for (row of rowsA(); track row.id) {
              <li forDraggable [dragData]="row" [attr.data-test-id]="'a-' + row.id">
                {{ row.label }}
              </li>
            }
          </ul>
          <ul
            forDropList
            #listB="forDropList"
            [autoScroll]="false"
            [orientation]="orientationB()"
            [dir]="dirB()"
            [connectedTo]="[listA]"
          >
            @for (row of rowsB(); track row.id) {
              <li forDraggable [dragData]="row" [attr.data-test-id]="'b-' + row.id">
                {{ row.label }}
              </li>
            }
          </ul>
        `,
      })
      class MixedAxisConnectedHost {
        readonly listRefA = viewChild.required<ForDropList>('listA');
        readonly rowsA: WritableSignal<Row[]> = signal([
          { id: 1, label: 'A1' },
          { id: 2, label: 'A2' },
          { id: 3, label: 'A3' },
        ]);
        readonly rowsB: WritableSignal<Row[]> = signal([
          { id: 1, label: 'B1' },
          { id: 2, label: 'B2' },
        ]);
        readonly orientationB = signal<'vertical' | 'horizontal' | 'mixed'>('horizontal');
        readonly dirB = signal<'ltr' | 'rtl'>('ltr');
        readonly lastDropA = signal<ForDragDropEvent | null>(null);
        onDropA(e: ForDragDropEvent): void {
          this.lastDropA.set(e);
        }
      }

      function layoutMixedAxis(el: HTMLElement, counter: { n: number }): void {
        const lists = el.querySelectorAll<HTMLElement>('[forDropList]');
        const listA = lists[0]!;
        const listB = lists[1]!;
        stubRect(listA, { left: 0, top: 0, right: 200, bottom: 240 }, counter);
        listA.querySelectorAll<HTMLElement>('[forDraggable]').forEach((item, i) => {
          stubRect(item, { left: 0, top: i * 20, right: 200, bottom: i * 20 + 20 }, counter);
        });
        stubRect(listB, { left: 300, top: 0, right: 500, bottom: 40 }, counter);
        listB.querySelectorAll<HTMLElement>('[forDraggable]').forEach((item, i) => {
          stubRect(
            item,
            { left: 300 + i * 100, top: 0, right: 400 + i * 100, bottom: 40 },
            counter,
          );
        });
      }

      it('a pointer drop into a horizontal connected list resolves the index on that list own axis', async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(MixedAxisConnectedHost);
        fixture.detectChanges();
        await flush(fixture);
        const el = fixture.nativeElement as HTMLElement;
        const counter = { n: 0 };
        layoutMixedAxis(el, counter);
        const comp = fixture.componentInstance;
        const list = comp.listRefA();

        const pending: { cb: FrameRequestCallback | null } = { cb: null };
        makeRaf(pending);

        list.pointerLift(itemEl(el, 'a-1'), { x: 100, y: 10 });
        list.pointerMove({ x: 360, y: 20 });
        runFrame(pending);
        runFrame(pending);
        list.drop();
        fixture.detectChanges();

        const drop = comp.lastDropA();
        expect(drop!.container.host).toBe(listEl(el, 1));
        expect(drop!.currentIndex).toBe(1);
      });

      it('a vertical connected list resolves the same point on its own axis', async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(MixedAxisConnectedHost);
        fixture.detectChanges();
        await flush(fixture);
        const comp = fixture.componentInstance;
        comp.orientationB.set('vertical');
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const counter = { n: 0 };
        layoutMixedAxis(el, counter);
        const list = comp.listRefA();

        const pending: { cb: FrameRequestCallback | null } = { cb: null };
        makeRaf(pending);

        list.pointerLift(itemEl(el, 'a-1'), { x: 100, y: 10 });
        list.pointerMove({ x: 360, y: 20 });
        runFrame(pending);
        runFrame(pending);
        list.drop();
        fixture.detectChanges();

        const drop = comp.lastDropA();
        expect(drop!.container.host).toBe(listEl(el, 1));
        expect(drop!.currentIndex).toBe(2);
      });

      it('a pointer drop into an rtl connected list mirrors the insertion comparison', async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(MixedAxisConnectedHost);
        fixture.detectChanges();
        await flush(fixture);
        const comp = fixture.componentInstance;
        comp.dirB.set('rtl');
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const counter = { n: 0 };
        layoutMixedAxis(el, counter);
        const list = comp.listRefA();

        const pending: { cb: FrameRequestCallback | null } = { cb: null };
        makeRaf(pending);

        list.pointerLift(itemEl(el, 'a-1'), { x: 100, y: 10 });
        list.pointerMove({ x: 360, y: 20 });
        runFrame(pending);
        runFrame(pending);
        list.drop();
        fixture.detectChanges();

        const drop = comp.lastDropA();
        expect(drop!.container.host).toBe(listEl(el, 1));
        expect(drop!.currentIndex).toBe(0);
      });
    });
  });

  describe('liveSort index neutrality (#1392 item 8)', () => {
    interface FakeFrames {
      readonly scheduled: Map<number, FrameRequestCallback>;
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPlaceholder],
      template: `
        <ul forDropList [liveSort]="liveSort()" [autoScroll]="false" (dragDrop)="onDrop($event)">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
              {{ row.label }}
              <ng-template forDragPlaceholder><span class="ph">gap</span></ng-template>
            </li>
          }
        </ul>
      `,
    })
    class LiveSortParityHost {
      readonly liveSort = signal(false);
      readonly rows: WritableSignal<Row[]> = signal(
        Array.from({ length: 6 }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` })),
      );
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
      }
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPlaceholder],
      template: `
        <ul forDropList orientation="mixed" liveSort [autoScroll]="false">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
              {{ row.label }}
              <ng-template forDragPlaceholder><span class="ph">gap</span></ng-template>
            </li>
          }
        </ul>
      `,
    })
    class LiveSortMixedGridHost {
      readonly rows: WritableSignal<Row[]> = signal(
        Array.from({ length: 3 }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` })),
      );
    }

    function firePointer(
      target: HTMLElement,
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          button: 0,
          pointerType: 'mouse',
        }),
      );
    }

    function makeRaf(frames: FakeFrames): void {
      let nextHandle = 1;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        const handle = nextHandle++;
        frames.scheduled.set(handle, cb);
        return handle;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle: number) => {
        frames.scheduled.delete(handle);
      });
    }

    function runFrame(frames: FakeFrames): void {
      const due = [...frames.scheduled.values()];
      frames.scheduled.clear();
      for (const cb of due) {
        cb(performance.now());
      }
    }

    function flowRect(left: number, top: number, width: number, height: number): DOMRect {
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left,
        y: top,
        toJSON() {},
      };
    }

    function installFlowLayout(
      list: HTMLElement,
      options: { cols?: number; width?: number; height?: number } = {},
    ): void {
      const cols = options.cols ?? 1;
      const width = options.width ?? 200;
      const height = options.height ?? 20;
      const slotOf = (el: HTMLElement): number =>
        Array.from(list.children)
          .filter((child) => (child as HTMLElement).style.display !== 'none')
          .indexOf(el);
      list.getBoundingClientRect = () => flowRect(0, 0, cols * width, 1000);
      list.querySelectorAll<HTMLElement>('[forDraggable]').forEach((item) => {
        item.getBoundingClientRect = () => {
          const slot = slotOf(item);
          if (slot < 0) {
            return flowRect(0, 0, 0, 0);
          }
          return flowRect((slot % cols) * width, Math.floor(slot / cols) * height, width, height);
        };
      });
    }

    function placeholderSlot(list: HTMLElement): number {
      return Array.from(list.children)
        .filter((child) => (child as HTMLElement).style.display !== 'none')
        .indexOf(list.querySelector('.ph')!);
    }

    function driveMixedGridRest(
      fixture: ComponentFixture<LiveSortMixedGridHost>,
      frames: FakeFrames,
    ): number[] {
      const el = fixture.nativeElement as HTMLElement;
      const list = listEl(el);
      const item = itemEl(el, 1);
      const slots: number[] = [];
      for (let i = 0; i < 4; i++) {
        runFrame(frames);
        slots.push(placeholderSlot(list));
        firePointer(item, 'pointermove', 120, 80);
        slots.push(placeholderSlot(list));
      }
      return slots;
    }

    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('resolves the same committed drop index with liveSort on as with liveSort off', async () => {
      async function run(liveSort: boolean): Promise<number> {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(LiveSortParityHost);
        const comp = fixture.componentInstance;
        comp.liveSort.set(liveSort);
        fixture.detectChanges();
        await flush(fixture);
        const el = fixture.nativeElement as HTMLElement;
        installFlowLayout(listEl(el), { height: 20 });
        const frames: FakeFrames = { scheduled: new Map() };
        makeRaf(frames);
        const first = itemEl(el, 1);

        firePointer(first, 'pointerdown', 100, 10);
        firePointer(first, 'pointermove', 100, 95);
        fixture.detectChanges();
        await flush(fixture);
        runFrame(frames);
        firePointer(first, 'pointermove', 100, 65);
        runFrame(frames);
        firePointer(first, 'pointerup', 100, 65);
        fixture.detectChanges();
        await flush(fixture);

        return comp.lastDrop()!.currentIndex;
      }

      expect(await run(false)).toBe(2);
      expect(await run(true)).toBe(2);
    });

    it('settles the placeholder at one slot when the pointer rests on a mixed-grid boundary', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LiveSortMixedGridHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      installFlowLayout(listEl(el), { cols: 2, width: 100, height: 50 });
      const frames: FakeFrames = { scheduled: new Map() };
      makeRaf(frames);
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 50, 25);
      firePointer(first, 'pointermove', 120, 80);
      fixture.detectChanges();
      await flush(fixture);

      const slots = driveMixedGridRest(fixture, frames);

      expect(slots[0]).toBe(2);
      expect(new Set(slots).size).toBe(1);
    });

    it('announces a live-sort move once while the pointer rests on a mixed-grid boundary', async () => {
      const moves: number[] = [];
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideForDragDropDefaults({
            announceMove: (label, index, total) => {
              moves.push(index);
              return `${label} ${index}/${total}`;
            },
          }),
        ],
      });
      const fixture = TestBed.createComponent(LiveSortMixedGridHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      installFlowLayout(listEl(el), { cols: 2, width: 100, height: 50 });
      const frames: FakeFrames = { scheduled: new Map() };
      makeRaf(frames);
      const first = itemEl(el, 1);

      firePointer(first, 'pointerdown', 50, 25);
      firePointer(first, 'pointermove', 120, 80);
      fixture.detectChanges();
      await flush(fixture);

      driveMixedGridRest(fixture, frames);

      expect(moves).toHaveLength(1);
    });
  });

  describe('animated liveSort drop (#1392 item 9)', () => {
    interface FakeFrames {
      readonly scheduled: Map<number, FrameRequestCallback>;
    }

    @Component({
      imports: [ForDropList, ForDraggable, ForDragPlaceholder],
      template: `
        <ul forDropList liveSort animateReorder [autoScroll]="false" (dragDrop)="onDrop($event)">
          @for (row of rows(); track row.id) {
            <li forDraggable [dragData]="row" [attr.data-test-id]="row.id">
              {{ row.label }}
              <ng-template forDragPlaceholder><span class="ph">gap</span></ng-template>
            </li>
          }
        </ul>
      `,
    })
    class LiveSortAnimateHost {
      readonly rows: WritableSignal<Row[]> = signal(
        Array.from({ length: 4 }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` })),
      );
      readonly lastDrop = signal<ForDragDropEvent | null>(null);
      readonly dropSnapshot = signal<boolean | null>(null);
      onDrop(event: ForDragDropEvent): void {
        this.lastDrop.set(event);
        this.dropSnapshot.set(event.previousContainer.host.querySelector('.ph') !== null);
        this.rows.set(moveItemInArray(this.rows(), event.previousIndex, event.currentIndex));
      }
    }

    function firePointer(
      target: HTMLElement,
      type: 'pointerdown' | 'pointermove' | 'pointerup',
      clientX: number,
      clientY: number,
    ): void {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          button: 0,
          pointerType: 'mouse',
        }),
      );
    }

    function makeRaf(frames: FakeFrames): void {
      let nextHandle = 1;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
        const handle = nextHandle++;
        frames.scheduled.set(handle, cb);
        return handle;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle: number) => {
        frames.scheduled.delete(handle);
      });
    }

    function runFrame(frames: FakeFrames): void {
      const due = [...frames.scheduled.values()];
      frames.scheduled.clear();
      for (const cb of due) {
        cb(performance.now());
      }
    }

    function flowRect(left: number, top: number, width: number, height: number): DOMRect {
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left,
        y: top,
        toJSON() {},
      };
    }

    function installFlowLayout(list: HTMLElement, options: { height?: number } = {}): void {
      const width = 200;
      const height = options.height ?? 20;
      const slotOf = (el: HTMLElement): number =>
        Array.from(list.children)
          .filter((child) => (child as HTMLElement).style.display !== 'none')
          .indexOf(el);
      list.getBoundingClientRect = () => flowRect(0, 0, width, 1000);
      list.querySelectorAll<HTMLElement>('[forDraggable]').forEach((item) => {
        item.getBoundingClientRect = () => {
          const slot = slotOf(item);
          if (slot < 0) {
            return flowRect(0, 0, 0, 0);
          }
          return flowRect(0, slot * height, width, height);
        };
      });
    }

    function placeholderSlot(list: HTMLElement): number {
      return Array.from(list.children)
        .filter((child) => (child as HTMLElement).style.display !== 'none')
        .indexOf(list.querySelector('.ph')!);
    }

    async function liftAndLiveSort(
      fixture: ComponentFixture<LiveSortAnimateHost>,
      frames: FakeFrames,
    ): Promise<void> {
      const first = itemEl(fixture.nativeElement as HTMLElement, 1);
      firePointer(first, 'pointerdown', 100, 10);
      firePointer(first, 'pointermove', 100, 18);
      fixture.detectChanges();
      await flush(fixture);
      runFrame(frames);
      firePointer(first, 'pointermove', 100, 55);
      runFrame(frames);
    }

    afterEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
      document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
    });

    it('leaves the live-sorted siblings in place — no FLIP jump-back on drop', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LiveSortAnimateHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const list = listEl(el);
      installFlowLayout(list, { height: 20 });
      const frames: FakeFrames = { scheduled: new Map() };
      makeRaf(frames);

      await liftAndLiveSort(fixture, frames);
      expect(placeholderSlot(list)).toBe(2);

      firePointer(itemEl(el, 1), 'pointerup', 100, 55);
      fixture.detectChanges();
      await flush(fixture);

      expect(fixture.componentInstance.lastDrop()!.currentIndex).toBe(2);
      expect(el.querySelectorAll('[data-drag-animating]')).toHaveLength(0);
    });

    it('keeps the live-sorted placeholder mounted until after the drop event is emitted', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LiveSortAnimateHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const list = listEl(el);
      installFlowLayout(list, { height: 20 });
      const frames: FakeFrames = { scheduled: new Map() };
      makeRaf(frames);

      await liftAndLiveSort(fixture, frames);
      expect(placeholderSlot(list)).toBe(2);

      firePointer(itemEl(el, 1), 'pointerup', 100, 55);
      fixture.detectChanges();
      await flush(fixture);

      expect(fixture.componentInstance.dropSnapshot()).toBe(true);
      expect(list.querySelector('.ph')).toBeNull();
    });

    it('skips a display:none sibling when capturing FLIP first-rects', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(LiveSortAnimateHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const list = listEl(el);
      installFlowLayout(list, { height: 20 });
      const hidden = itemEl(el, 4);
      hidden.style.display = 'none';
      const frames: FakeFrames = { scheduled: new Map() };
      makeRaf(frames);

      await liftAndLiveSort(fixture, frames);
      expect(placeholderSlot(list)).toBe(2);

      firePointer(itemEl(el, 1), 'pointerup', 100, 55);
      hidden.style.display = '';
      fixture.detectChanges();
      await flush(fixture);

      expect(fixture.componentInstance.lastDrop()!.currentIndex).toBe(3);
      expect(hidden.hasAttribute('data-drag-animating')).toBe(false);
      expect(el.querySelectorAll('[data-drag-animating]')).toHaveLength(0);
    });
  });
});
