import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, renderHost } from '../../test-utils';
import { ForTree } from './tree';
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
    expect(event).not.toBeNull();
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
    expect(event).not.toBeNull();
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
    expect(event).not.toBeNull();
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

describe('ForTreeNodeDrag — zoneless', () => {
  it('emits nodeDrop in a zoneless TestBed context', async () => {
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

  it('reflects data-drop-position in a zoneless TestBed context', async () => {
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
