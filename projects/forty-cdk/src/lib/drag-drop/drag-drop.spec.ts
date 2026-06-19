import {
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { withReducedMotion } from '../../test-utils/reduced-motion';

import { flush, pressKey, renderHost } from '../../test-utils';
import { provideForDragDropDefaults } from './drag-drop-defaults';
import { ForDragHandle } from './drag-handle';
import { ForDragPlaceholder } from './drag-placeholder';
import { ForDragPreview } from './drag-preview';
import { ForDraggable } from './draggable';
import { ForDropList } from './drop-list';
import { ForDropListGroup } from './drop-list-group';
import { moveItemInArray } from './move-item-in-array';
import type { ForDragDropEvent } from './drag-drop-context';

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
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
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

function itemEl(host: HTMLElement, testId: string | number): HTMLElement {
  return host.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;
}

function listEl(host: HTMLElement, index = 0): HTMLElement {
  return host.querySelectorAll<HTMLElement>('[forDropList]')[index]!;
}

describe('ForDropList + ForDraggable', () => {
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
      expect(drop!.previousIndex).toBe(0);
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
        '[forty-cdk/drag-drop] ForDragPreview must be used inside a [forDraggable] element.',
      );
    });

    it('ForDragPlaceholder outside [forDraggable] throws the orphan error', () => {
      expect(() => renderHost(OrphanPlaceholderHost)).toThrow(
        '[forty-cdk/drag-drop] ForDragPlaceholder must be used inside a [forDraggable] element.',
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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
      expect(drop).not.toBeNull();
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

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
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

        first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        first.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(hostClick).not.toHaveBeenCalled();
      } finally {
        first.removeEventListener('click', hostClick);
      }
    });
  });
});
