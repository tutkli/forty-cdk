import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { provideForTreeDefaults } from './tree-defaults';
import { ForTreeGroup } from './tree-group';
import { ForTreeItem } from './tree-item';
import { ForTreeItemLabel } from './tree-item-label';
import { ForTreeItemToggle } from './tree-item-toggle';
import { ForTreeNodeDrag } from './tree-node-drag';
import { ForTreeNodeDragHandle } from './tree-node-drag-handle';
import type { ForTreeDragDropEvent } from './tree-drag-drop-event';

@Component({
  imports: [
    ForTree,
    ForTreeNodeDrag,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
  ],
  template: `
    <ul
      forTree
      forTreeNodeDrag
      [(expanded)]="open"
      [disabled]="treeDisabled()"
      [canDrop]="canDropFn()"
      (nodeDrop)="onDrop($event)"
      aria-label="Files"
    >
      <li forTreeItem value="docs" data-testid="docs">
        <div forTreeItemLabel>
          <span forTreeItemToggle>▸</span>
          Docs
        </div>
        @if (open().includes('docs')) {
          <ul forTreeGroup>
            <li forTreeItem value="resume" data-testid="resume">
              <div forTreeItemLabel>Resume</div>
            </li>
            <li forTreeItem value="report" data-testid="report">
              <div forTreeItemLabel>Report</div>
            </li>
          </ul>
        }
      </li>
      <li forTreeItem value="music" data-testid="music">
        <div forTreeItemLabel>Music</div>
      </li>
      <li forTreeItem value="notes" data-testid="notes" [disabled]="notesDisabled()">
        <div forTreeItemLabel>Notes</div>
      </li>
    </ul>
    <button type="button" data-testid="outside">outside</button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TreeDragHost {
  readonly open = signal<readonly string[]>([]);
  readonly treeDisabled = signal(false);
  readonly notesDisabled = signal(false);
  readonly canDropFn = signal<((e: ForTreeDragDropEvent) => boolean) | undefined>(undefined);
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);

  onDrop(event: ForTreeDragDropEvent): void {
    this.dropped.set(event);
  }
}

function dispatchKey(el: HTMLElement, key: string, opts: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

function focusOut(el: HTMLElement, relatedTarget: HTMLElement | null = null): void {
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
}

function firePointer(target: EventTarget, type: string, x: number, y: number): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('ForTreeNodeDrag — keyboard', () => {
  it('lifts and drops a node with Ctrl+Space, ArrowDown, Space', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(instance.dropped()).toBeNull();

    dispatchKey(tree, 'ArrowDown', {});
    await f();

    dispatchKey(tree, ' ', {});
    await f();

    const event = instance.dropped();
    expect(event!.node).toBe('docs');
    expect(event!.previousParent).toBeNull();
  });

  it('re-parents via ArrowRight (deepen into the preceding node)', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    musicEl.focus();

    dispatchKey(musicEl, ' ', { ctrlKey: true });
    await f();

    dispatchKey(tree, 'ArrowRight', {});
    await f();

    dispatchKey(tree, ' ', {});
    await f();

    const event = instance.dropped();
    expect(event!.node).toBe('music');
    expect(event!.newParent).toBe('docs');
  });

  it('drops the last node in place on ArrowDown without overflowing', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const notesEl = query<HTMLElement>('[data-testid="notes"]')!;
    notesEl.focus();

    dispatchKey(notesEl, ' ', { ctrlKey: true });
    await f();

    dispatchKey(tree, 'ArrowDown', {});
    await f();

    dispatchKey(tree, ' ', {});
    await f();

    const event = instance.dropped();
    expect(event!.node).toBe('notes');
  });

  it('does not lift a disabled node', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    instance.notesDisabled.set(true);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const notesEl = query<HTMLElement>('[data-testid="notes"]')!;
    notesEl.focus();

    dispatchKey(notesEl, ' ', { ctrlKey: true });
    await f();

    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()).toBeNull();
  });

  it('cancels on Escape and does not emit nodeDrop', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    dispatchKey(tree, 'Escape', {});
    await f();

    expect(instance.dropped()).toBeNull();
  });

  it('collapses an expanded node on lift and restores on cancel', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.open.set(['docs']);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    expect(instance.open()).toContain('docs');

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(instance.open()).not.toContain('docs');

    dispatchKey(tree, 'Escape', {});
    await f();

    expect(instance.open()).toContain('docs');
  });

  it('collapses an expanded node on lift and restores on drop', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.open.set(['docs']);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(instance.open()).not.toContain('docs');

    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.open()).toContain('docs');
  });

  it('veto via canDrop suppresses nodeDrop and restores expansion', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.open.set(['docs']);
    instance.canDropFn.set(() => false);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()).toBeNull();
    expect(instance.open()).toContain('docs');
  });

  it('does not lift when tree is disabled', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.treeDisabled.set(true);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()).toBeNull();
  });

  it('reflects data-dragging on the host while a session is live', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    expect(tree.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(true);

    dispatchKey(tree, 'Escape', {});
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(false);
  });
});

describe('ForTreeNodeDrag — a focusout only cancels when focus really left the tree', () => {
  it('keeps the lift when the focusout reports no destination and focus is still inside', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();
    focusOut(docsEl);
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(true);

    dispatchKey(tree, 'ArrowDown', {});
    await f();
    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()!.node).toBe('docs');
  });

  it('keeps the lift when focus moves to another node inside the tree', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();
    focusOut(docsEl, query<HTMLElement>('[data-testid="music"]')!);
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(true);

    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()!.node).toBe('docs');
  });

  it('cancels the lift when focus lands on an element outside the tree', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    focusOut(docsEl, query<HTMLElement>('[data-testid="outside"]')!);
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()).toBeNull();
  });

  it('cancels the lift when the focusout reports no destination and focus left the tree', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    docsEl.blur();
    focusOut(docsEl);
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(false);
    expect(instance.dropped()).toBeNull();
  });
});

describe('ForTreeNodeDrag — drop indicator', () => {
  it('anchors data-drop-position to the row the node will land beside, tracking ArrowDown', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    const notesEl = query<HTMLElement>('[data-testid="notes"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBe('before');
    expect(notesEl.getAttribute('data-drop-position')).toBeNull();
    expect(docsEl.getAttribute('data-drop-position')).toBeNull();

    dispatchKey(tree, 'ArrowDown', {});
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBeNull();
    expect(notesEl.getAttribute('data-drop-position')).toBe('before');

    dispatchKey(tree, 'ArrowDown', {});
    await f();

    expect(notesEl.getAttribute('data-drop-position')).toBe('after');
    expect(musicEl.getAttribute('data-drop-position')).toBeNull();
  });

  it('exposes the resolved depth via --for-tree-drop-level and deepens it on ArrowRight', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    const notesEl = query<HTMLElement>('[data-testid="notes"]')!;
    musicEl.focus();

    dispatchKey(musicEl, ' ', { ctrlKey: true });
    await f();

    expect(notesEl.getAttribute('data-drop-position')).toBe('before');
    expect(tree.style.getPropertyValue('--for-tree-drop-level')).toBe('1');

    dispatchKey(tree, 'ArrowRight', {});
    await f();

    expect(notesEl.getAttribute('data-drop-position')).toBe('before');
    expect(tree.style.getPropertyValue('--for-tree-drop-level')).toBe('2');
  });

  it('clears data-drop-position on drop', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBe('before');

    dispatchKey(tree, ' ', {});
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBeNull();
  });

  it('clears data-drop-position on Escape', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBe('before');

    dispatchKey(tree, 'Escape', {});
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBeNull();
  });

  it('clears data-drop-position on Tab', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBe('before');

    dispatchKey(tree, 'Tab', {});
    await f();

    expect(musicEl.getAttribute('data-drop-position')).toBeNull();
  });
});

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  template: `
    <ul forTree aria-label="Files">
      <li forTreeItem value="a" data-testid="a"><div forTreeItemLabel>A</div></li>
      <li forTreeItem value="b" data-testid="b"><div forTreeItemLabel>B</div></li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class PlainTreeHost {}

describe('ForTreeItem — without [forTreeNodeDrag]', () => {
  it('never emits data-drop-position', async () => {
    const { query, flush: f } = renderHost(PlainTreeHost);
    await f();

    const a = query<HTMLElement>('[data-testid="a"]')!;
    const b = query<HTMLElement>('[data-testid="b"]')!;

    expect(a.hasAttribute('data-drop-position')).toBe(false);
    expect(b.hasAttribute('data-drop-position')).toBe(false);
  });
});

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel, ForTreeNodeDragHandle],
  template: `
    <ul forTree forTreeNodeDrag (nodeDrop)="dropped.set($event)" aria-label="Files">
      <li forTreeItem value="docs" data-testid="docs">
        <div forTreeItemLabel>
          <span forTreeNodeDragHandle data-testid="handle-docs">⠿</span>
          Docs
        </div>
      </li>
      <li forTreeItem value="music" data-testid="music">
        <div forTreeItemLabel>Music</div>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TreeDragHandleHost {
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);
}

describe('ForTreeNodeDragHandle', () => {
  it('mounts without error when inside a [forTreeNodeDrag]', () => {
    expect(() => renderHost(TreeDragHandleHost)).not.toThrow();
  });

  it('throws when used outside [forTreeNodeDrag]', () => {
    @Component({
      imports: [ForTreeItem, ForTreeItemLabel, ForTreeNodeDragHandle, ForTree],
      template: `
        <ul forTree aria-label="X">
          <li forTreeItem value="a">
            <div forTreeItemLabel>
              <span forTreeNodeDragHandle>⠿</span>
              A
            </div>
          </li>
        </ul>
      `,
    })
    class BadHost {}

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    expect(() => {
      const f = TestBed.createComponent(BadHost);
      f.detectChanges();
    }).toThrow(/\[forty-cdk\/tree\]/);
  });
});

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel],
  providers: [
    provideForTreeDefaults({
      dragAnnounceLift: (label) => `[lift] ${label}`,
      dragAnnounceMove: (label, parentLabel, position, total) =>
        `[move] ${label} @ ${parentLabel ?? 'root'} ${position}/${total}`,
      dragAnnounceDrop: (label, parentLabel, position, total) =>
        `[drop] ${label} @ ${parentLabel ?? 'root'} ${position}/${total}`,
      dragAnnounceCancel: (label) => `[cancel] ${label}`,
      dragAnnounceInvalid: (label) => `[invalid] ${label}`,
    }),
  ],
  template: `
    <ul
      forTree
      forTreeNodeDrag
      [canDrop]="canDropFn()"
      (nodeDrop)="dropped.set($event)"
      aria-label="Files"
    >
      <li forTreeItem value="a" data-testid="a"><div forTreeItemLabel>Alpha</div></li>
      <li forTreeItem value="b" data-testid="b"><div forTreeItemLabel>Bravo</div></li>
      <li forTreeItem value="c" data-testid="c"><div forTreeItemLabel>Charlie</div></li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TreeDragI18nHost {
  readonly canDropFn = signal<((e: ForTreeDragDropEvent) => boolean) | undefined>(undefined);
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);
}

function liveRegion(politeness: 'polite' | 'assertive'): HTMLElement | undefined {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(`[aria-live="${politeness}"]`),
  ).find((el) => !el.closest('[forTree]'));
}

describe('ForTreeNodeDrag — i18n announcements', () => {
  it('lift / move / drop announce via the consumer formatters, routing parentLabel through', async () => {
    const { query, flush: f } = renderHost(TreeDragI18nHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const alpha = query<HTMLElement>('[data-testid="a"]')!;
    alpha.focus();

    dispatchKey(alpha, ' ', { ctrlKey: true });
    await f();
    expect(liveRegion('assertive')?.textContent).toBe('[lift] Alpha');

    dispatchKey(tree, 'ArrowDown', {});
    await f();
    expect(liveRegion('polite')?.textContent).toBe('[move] Alpha @ root 2/3');

    dispatchKey(tree, 'ArrowRight', {});
    await f();
    expect(liveRegion('polite')?.textContent).toBe('[move] Alpha @ Bravo 1/1');

    dispatchKey(tree, ' ', {});
    await f();
    expect(liveRegion('assertive')?.textContent).toBe('[drop] Alpha @ Bravo 1/1');
  });

  it('cancel announces via the consumer formatter', async () => {
    const { query, flush: f } = renderHost(TreeDragI18nHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const alpha = query<HTMLElement>('[data-testid="a"]')!;
    alpha.focus();

    dispatchKey(alpha, ' ', { ctrlKey: true });
    await f();
    dispatchKey(tree, 'Escape', {});
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[cancel] Alpha');
  });

  it('a canDrop veto leaves the invalid message in the assertive region and suppresses the drop', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragI18nHost);
    instance.canDropFn.set(() => false);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const alpha = query<HTMLElement>('[data-testid="a"]')!;
    alpha.focus();

    dispatchKey(alpha, ' ', { ctrlKey: true });
    await f();
    dispatchKey(tree, ' ', {});
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[invalid] Alpha');
    expect(instance.dropped()).toBeNull();
  });

  it('falls back to the English phrasing when no override is provided', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const musicEl = query<HTMLElement>('[data-testid="music"]')!;
    musicEl.focus();

    dispatchKey(musicEl, ' ', { ctrlKey: true });
    await f();

    expect(liveRegion('assertive')?.textContent).toBe(
      'Picked up Music. Use arrow keys to move, Space to drop, Escape to cancel.',
    );
  });
});

describe('ForTreeNodeDrag — keyboard drag', () => {
  it('emits nodeDrop after a keyboard lift and drop', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    const fixture = TestBed.createComponent(TreeDragHost);
    await flush(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const tree = root.querySelector('[forTree]') as HTMLElement;
    const docsEl = root.querySelector('[data-testid="docs"]') as HTMLElement;
    docsEl.focus();

    docsEl.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    await flush(fixture);

    tree.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await flush(fixture);

    expect(fixture.componentInstance.dropped()).not.toBeNull();
    expect(fixture.componentInstance.dropped()!.node).toBe('docs');
  });

  it('reflects data-drop-position on the sibling after a lift', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    const fixture = TestBed.createComponent(TreeDragHost);
    await flush(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const docsEl = root.querySelector('[data-testid="docs"]') as HTMLElement;
    const musicEl = root.querySelector('[data-testid="music"]') as HTMLElement;
    docsEl.focus();

    docsEl.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', ctrlKey: true, bubbles: true, cancelable: true }),
    );
    await flush(fixture);

    expect(musicEl.getAttribute('data-drop-position')).toBe('before');
  });
});

@Directive({
  selector: '[wrappedTreeItem]',
  hostDirectives: [{ directive: ForTreeItem, inputs: ['value', 'disabled'] }],
})
class WrappedTreeItem {}

@Component({
  imports: [ForTree, ForTreeNodeDrag, WrappedTreeItem, ForTreeItemLabel],
  template: `
    <ul forTree forTreeNodeDrag (nodeDrop)="dropped.set($event)" aria-label="Files">
      <li wrappedTreeItem value="docs" data-testid="docs">
        <div forTreeItemLabel data-testid="label-docs">Docs</div>
      </li>
      <li wrappedTreeItem value="music" data-testid="music">
        <div forTreeItemLabel data-testid="label-music">Music</div>
      </li>
      <li wrappedTreeItem value="notes" data-testid="notes">
        <div forTreeItemLabel data-testid="label-notes">Notes</div>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class WrappedTreeDragHost {
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);
}

describe('ForTreeNodeDrag — pointer item resolution (item 10-c)', () => {
  it('resolves the lifted node from a registered handle on the common case', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    const label = docsEl.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    firePointer(label, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    firePointer(document, 'pointerup', 100, 120);
    await f();

    const event = instance.dropped();
    expect(event!.node).toBe('docs');
  });

  it('resolves the lifted node when the item is composed via hostDirectives (no [forTreeItem] attribute)', async () => {
    const { instance, query, flush: f } = renderHost(WrappedTreeDragHost);
    await f();

    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    expect(docsEl.hasAttribute('forTreeItem')).toBe(false);
    expect(docsEl.getAttribute('role')).toBe('treeitem');
    const label = query<HTMLElement>('[data-testid="label-docs"]')!;

    firePointer(label, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    firePointer(document, 'pointerup', 100, 120);
    await f();

    const event = instance.dropped();
    expect(event!.node).toBe('docs');
  });

  it('does not start a pointer drag from outside any tree item', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;

    firePointer(tree, 'pointerdown', 5, 5);
    firePointer(document, 'pointermove', 5, 25);
    await f();
    firePointer(document, 'pointerup', 5, 25);
    await f();

    expect(instance.dropped()).toBeNull();
  });

  it('resolves the hostDirective-composed node', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(WrappedTreeDragHost);
    await flush(fixture);

    const root = fixture.nativeElement as HTMLElement;
    const label = root.querySelector<HTMLElement>('[data-testid="label-music"]')!;

    firePointer(label, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await flush(fixture);
    firePointer(document, 'pointerup', 100, 120);
    await flush(fixture);

    const event = fixture.componentInstance.dropped();
    expect(event!.node).toBe('music');
  });
});

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel, ForTreeNodeDragHandle],
  template: `
    <ul forTree forTreeNodeDrag (nodeDrop)="dropped.set($event)" aria-label="Files">
      <li forTreeItem value="docs" data-testid="docs">
        <div forTreeItemLabel data-testid="docs-label">
          <svg viewBox="0 0 8 8" aria-hidden="true">
            <rect data-testid="docs-icon" width="8" height="8"></rect>
          </svg>
          Docs
        </div>
      </li>
      <li forTreeItem value="music" data-testid="music">
        <span forTreeNodeDragHandle>
          <svg viewBox="0 0 8 8" aria-hidden="true">
            <rect data-testid="music-handle-icon" width="8" height="8"></rect>
          </svg>
        </span>
        <div forTreeItemLabel>Music</div>
      </li>
      <li forTreeItem value="notes" data-testid="notes">
        <span forTreeNodeDragHandle>⠿</span>
        <div forTreeItemLabel>
          <svg viewBox="0 0 8 8" aria-hidden="true">
            <rect data-testid="notes-icon" width="8" height="8"></rect>
          </svg>
          Notes
        </div>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SvgGrabTargetHost {
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);
}

describe('ForTreeNodeDrag — a pointer grab target is an Element, not an HTMLElement (#1677)', () => {
  it('lifts the node when the press lands on an SVG icon inside [forTreeItemLabel]', async () => {
    const { instance, query, flush: f } = renderHost(SvgGrabTargetHost);
    await f();

    const icon = query<SVGElement>('[data-testid="docs-icon"]')!;
    expect(icon instanceof HTMLElement).toBe(false);

    firePointer(icon, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()!.node).toBe('docs');
  });

  it('lifts the node when the press lands on an SVG icon inside [forTreeNodeDragHandle]', async () => {
    const { instance, query, flush: f } = renderHost(SvgGrabTargetHost);
    await f();

    const icon = query<SVGElement>('[data-testid="music-handle-icon"]')!;

    firePointer(icon, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()!.node).toBe('music');
  });

  it("still declines an SVG press that misses the item's registered handle", async () => {
    const { instance, query, flush: f } = renderHost(SvgGrabTargetHost);
    await f();

    const icon = query<SVGElement>('[data-testid="notes-icon"]')!;

    firePointer(icon, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()).toBeNull();
  });

  it('ignores a keyboard lift whose target is not an element', async () => {
    const { instance, query, flush: f } = renderHost(SvgGrabTargetHost);
    await f();

    const label = query<HTMLElement>('[data-testid="docs-label"]')!;
    const text = Array.from(label.childNodes).find(
      (node): node is Text => node instanceof Text && node.textContent!.includes('Docs'),
    )!;

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    text.dispatchEvent(event);
    await f();

    expect(event.defaultPrevented).toBe(false);
    expect(query<HTMLElement>('[forTreeNodeDrag]')!.hasAttribute('data-dragging')).toBe(false);
    expect(instance.dropped()).toBeNull();
  });
});
