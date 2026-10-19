import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { provideForDragDropDefaults, provideForTreeDefaults } from 'forty-cdk/defaults';
import { ForTreeGroup } from './tree-group';
import { ForTreeItem } from './tree-item';
import { ForTreeItemLabel } from './tree-item-label';
import { ForTreeItemToggle } from './tree-item-toggle';
import { ForTreeNodeDrag } from './tree-node-drag';
import { ForTreeNodeDragHandle } from './tree-node-drag-handle';
import type { ForTreeDragDropEvent } from './tree-drag-drop-event';
import { moveTreeNode } from './move-tree-node';

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
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
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

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel],
  template: `
    <ul forTree forTreeNodeDrag aria-label="Files">
      <li forTreeItem value="only" data-testid="only"><div forTreeItemLabel>Only</div></li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SingleNodeDragHost {}

describe('ForTreeNodeDrag — data-drop-target reflects whether the drop would be accepted (#2401)', () => {
  async function liftMusic(
    canDrop: ((e: ForTreeDragDropEvent) => boolean) | undefined,
  ): Promise<{ tree: HTMLElement; f: () => Promise<void> }> {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.canDropFn.set(canDrop);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const music = query<HTMLElement>('[data-testid="music"]')!;
    music.focus();
    dispatchKey(music, ' ', { ctrlKey: true });
    await f();
    return { tree, f };
  }

  it('is present while the resolved drop has no veto', async () => {
    const { tree } = await liftMusic(undefined);

    expect(tree.hasAttribute('data-dragging')).toBe(true);
    expect(tree.hasAttribute('data-drop-target')).toBe(true);
  });

  it('is absent while [canDrop] vetoes the resolved drop', async () => {
    const { tree } = await liftMusic(() => false);

    expect(tree.hasAttribute('data-dragging')).toBe(true);
    expect(tree.hasAttribute('data-drop-target')).toBe(false);
  });

  it('follows the veto as the target moves between accepted and rejected positions', async () => {
    const { tree, f } = await liftMusic((e) => e.newParent === null);
    expect(tree.hasAttribute('data-drop-target')).toBe(true);

    dispatchKey(tree, 'ArrowRight');
    await f();
    expect(tree.hasAttribute('data-drop-target')).toBe(false);

    dispatchKey(tree, 'ArrowLeft');
    await f();
    expect(tree.hasAttribute('data-drop-target')).toBe(true);
  });

  it('hands [canDrop] the event the drop would commit', async () => {
    const seen: ForTreeDragDropEvent[] = [];
    const { tree, f } = await liftMusic((e) => {
      seen.push(e);
      return true;
    });

    dispatchKey(tree, 'ArrowRight');
    await f();

    expect(seen.at(-1)).toEqual({
      node: 'music',
      previousParent: null,
      newParent: 'docs',
      previousIndex: 1,
      currentIndex: 0,
    });
  });

  it('is absent when no drop position resolves', async () => {
    const { query, flush: f } = renderHost(SingleNodeDragHost);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const only = query<HTMLElement>('[data-testid="only"]')!;
    only.focus();

    dispatchKey(only, ' ', { ctrlKey: true });
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(true);
    expect(tree.hasAttribute('data-drop-target')).toBe(false);
  });
});

describe('ForTreeNodeDrag — lift key', () => {
  it('lifts and drops a node with Shift+Enter, ArrowDown, Space', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, 'Enter', { shiftKey: true });
    await f();
    expect(tree.hasAttribute('data-dragging')).toBe(true);

    dispatchKey(tree, 'ArrowDown', {});
    await f();
    dispatchKey(tree, ' ', {});
    await f();

    expect(instance.dropped()!.node).toBe('docs');
  });

  it('does not lift on a Shift+Enter that commits an IME composition', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, 'Enter', { shiftKey: true, isComposing: true });
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(false);
  });

  it('lifts with the scope liftKey and no longer with the default chords', async () => {
    TestBed.configureTestingModule({
      providers: [provideForDragDropDefaults({ liftKey: (event) => event.key === 'F2' })],
    });
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const docsEl = query<HTMLElement>('[data-testid="docs"]')!;
    docsEl.focus();

    dispatchKey(docsEl, ' ', { ctrlKey: true });
    dispatchKey(docsEl, 'Enter', { shiftKey: true });
    await f();
    expect(tree.hasAttribute('data-dragging')).toBe(false);

    dispatchKey(docsEl, 'F2');
    await f();
    expect(tree.hasAttribute('data-dragging')).toBe(true);
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
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
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
      <li forTreeItem value="c" data-testid="c">
        <div forTreeItemLabel><span forTreeItemToggle>▸</span>Charlie</div>
      </li>
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

  it('announces a label without the aria-hidden glyph nested inside it', async () => {
    const { query, flush: f } = renderHost(TreeDragI18nHost);
    await f();

    const charlie = query<HTMLElement>('[data-testid="c"]')!;
    charlie.focus();

    dispatchKey(charlie, ' ', { ctrlKey: true });
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[lift] Charlie');
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

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
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
      <li forTreeItem value="a" textValue="Zulu" data-testid="a">
        <div forTreeItemLabel>Alpha</div>
      </li>
      <li forTreeItem value="b" textValue="Yankee" data-testid="b">
        <div forTreeItemLabel>Bravo</div>
      </li>
      <li forTreeItem value="c" data-testid="c">
        <div forTreeItemLabel><span forTreeItemToggle>▸</span>Charlie</div>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TreeDragTextValueHost {
  readonly canDropFn = signal<((e: ForTreeDragDropEvent) => boolean) | undefined>(undefined);
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);
}

describe('ForTreeNodeDrag — [textValue] in announcements', () => {
  it('announces the override on lift, move and drop, for the node and for its parent', async () => {
    const { query, flush: f } = renderHost(TreeDragTextValueHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const alpha = query<HTMLElement>('[data-testid="a"]')!;
    alpha.focus();

    dispatchKey(alpha, ' ', { ctrlKey: true });
    await f();
    expect(liveRegion('assertive')?.textContent).toBe('[lift] Zulu');

    dispatchKey(tree, 'ArrowDown', {});
    await f();
    expect(liveRegion('polite')?.textContent).toBe('[move] Zulu @ root 2/3');

    dispatchKey(tree, 'ArrowRight', {});
    await f();
    expect(liveRegion('polite')?.textContent).toBe('[move] Zulu @ Yankee 1/1');

    dispatchKey(tree, ' ', {});
    await f();
    expect(liveRegion('assertive')?.textContent).toBe('[drop] Zulu @ Yankee 1/1');
  });

  it('announces the override when the lift is cancelled', async () => {
    const { query, flush: f } = renderHost(TreeDragTextValueHost);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const alpha = query<HTMLElement>('[data-testid="a"]')!;
    alpha.focus();

    dispatchKey(alpha, ' ', { ctrlKey: true });
    await f();
    dispatchKey(tree, 'Escape', {});
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[cancel] Zulu');
  });

  it('announces the override when a canDrop veto rejects the drop', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragTextValueHost);
    instance.canDropFn.set(() => false);
    await f();

    const tree = query<HTMLElement>('[forTree]')!;
    const alpha = query<HTMLElement>('[data-testid="a"]')!;
    alpha.focus();

    dispatchKey(alpha, ' ', { ctrlKey: true });
    await f();
    dispatchKey(tree, ' ', {});
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[invalid] Zulu');
  });

  it('falls back to the label accessible text on a node carrying no override', async () => {
    const { query, flush: f } = renderHost(TreeDragTextValueHost);
    await f();

    const charlie = query<HTMLElement>('[data-testid="c"]')!;
    charlie.focus();

    dispatchKey(charlie, ' ', { ctrlKey: true });
    await f();

    expect(liveRegion('assertive')?.textContent).toBe('[lift] Charlie');
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

describe('ForTreeNodeDrag — the primary-button guard is scoped to a mouse press (#1699)', () => {
  it('starts the gesture for a touch press reporting a non-primary button', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTreeNodeDrag]')!;
    const label =
      query<HTMLElement>('[data-testid="docs"]')!.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    const down = firePointer(label, 'pointerdown', 100, 100, { pointerType: 'touch', button: 2 });
    expect(down.pointerType).toBe('touch');

    firePointer(document, 'pointermove', 100, 120, { pointerType: 'touch' });
    await f();

    expect(tree.getAttribute('data-dragging')).toBe('');

    firePointer(document, 'pointerup', 100, 120, { pointerType: 'touch' });
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(false);
    expect(instance.dropped()!.node).toBe('docs');
  });

  it('still declines a mouse press using a non-primary button', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();

    const tree = query<HTMLElement>('[forTreeNodeDrag]')!;
    const label =
      query<HTMLElement>('[data-testid="docs"]')!.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    const down = firePointer(label, 'pointerdown', 100, 100, { pointerType: 'mouse', button: 2 });
    expect(down.pointerType).toBe('mouse');

    firePointer(document, 'pointermove', 100, 120, { pointerType: 'mouse' });
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(false);
    expect(down.defaultPrevented).toBe(false);

    firePointer(document, 'pointerup', 100, 120, { pointerType: 'mouse' });
    await f();

    expect(instance.dropped()).toBeNull();
  });
});

interface FileNode {
  readonly id: string;
  readonly name: string;
  readonly children?: readonly FileNode[];
}

@Component({
  selector: 'test-file-node',
  imports: [ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup, FileNodeView],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem [value]="node().id" [attr.data-testid]="node().id">
      <div forTreeItemLabel>
        @if (node().children?.length) {
          <span forTreeItemToggle aria-hidden="true">▸</span>
        }
        {{ node().name }}
      </div>
      @if (node().children?.length && expanded().includes(node().id)) {
        <ul forTreeGroup>
          @for (child of node().children ?? []; track child.id) {
            <test-file-node [node]="child" [expanded]="expanded()" />
          }
        </ul>
      }
    </li>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileNodeView {
  readonly node = input.required<FileNode>();
  readonly expanded = input.required<readonly string[]>();
}

@Component({
  imports: [ForTree, ForTreeNodeDrag, FileNodeView],
  template: `
    <ul forTree forTreeNodeDrag [(expanded)]="open" (nodeDrop)="onDrop($event)" aria-label="Files">
      @for (n of roots(); track n.id) {
        <test-file-node [node]="n" [expanded]="open()" />
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AppliedDropTreeHost {
  readonly open = signal<readonly string[]>(['documents']);
  readonly roots = signal<readonly FileNode[]>([
    {
      id: 'documents',
      name: 'Documents',
      children: [
        { id: 'resume', name: 'Resume' },
        { id: 'projects', name: 'Projects' },
      ],
    },
    { id: 'readme', name: 'Readme' },
  ]);
  readonly drops: ForTreeDragDropEvent[] = [];

  onDrop(event: ForTreeDragDropEvent): void {
    this.drops.push(event);
    this.roots.update((roots) =>
      moveTreeNode(roots as FileNode[], {
        event,
        trackBy: (n) => n.id,
        children: (n) => n.children as FileNode[] | undefined,
        withChildren: (n, children) => ({ ...n, children: children as FileNode[] }),
      }),
    );
  }
}

describe('ForTreeNodeDrag — focus follows the dropped node (#2118)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  async function liftAndDrop(
    keys: readonly string[],
    open?: readonly string[],
  ): Promise<{ query: (selector: string) => HTMLElement | null; dropped: HTMLElement }> {
    const { instance, query, flush: f } = renderHost(AppliedDropTreeHost);
    if (open !== undefined) {
      instance.open.set(open);
    }
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const readme = query<HTMLElement>('[data-testid="readme"]')!;
    readme.focus();
    dispatchKey(readme, ' ', { ctrlKey: true });
    await f();
    for (const key of keys) {
      dispatchKey(tree, key);
      await f();
    }
    dispatchKey(tree, ' ');
    await f();
    await f();
    return { query: (selector) => query<HTMLElement>(selector), dropped: readme };
  }

  it('a re-parenting drop focuses the node in its new place, not <body>', async () => {
    const { query, dropped } = await liftAndDrop(['ArrowRight']);

    const moved = query('[data-testid="readme"]')!;
    expect(moved).not.toBe(dropped);
    expect(moved.parentElement?.closest('[data-testid="documents"]')).not.toBeNull();
    expect(document.activeElement).toBe(moved);
  });

  it('a drop into a collapsed parent focuses that parent', async () => {
    const { query } = await liftAndDrop(['ArrowRight'], []);

    expect(query('[data-testid="readme"]')).toBeNull();
    expect(document.activeElement).toBe(query('[data-testid="documents"]'));
  });

  it('a same-parent reorder keeps focus on the moved node', async () => {
    const { query } = await liftAndDrop(['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowLeft']);

    const roots = Array.from(query('[forTree]')!.children).map((el) =>
      el.querySelector('[forTreeItem]')?.getAttribute('data-testid'),
    );
    expect(roots).toEqual(['readme', 'documents']);
    expect(document.activeElement).toBe(query('[data-testid="readme"]'));
  });
});

describe('ForTreeNodeDrag — the sibling count of a drop into a collapsed parent (#2401)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  async function liftReadme(
    open: readonly string[],
  ): Promise<{ tree: HTMLElement; f: () => Promise<void> }> {
    const { instance, query, flush: f } = renderHost(AppliedDropTreeHost);
    instance.open.set(open);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const readme = query<HTMLElement>('[data-testid="readme"]')!;
    readme.focus();
    dispatchKey(readme, ' ', { ctrlKey: true });
    await f();
    return { tree, f };
  }

  it('announces no total for the move and the drop, since the hidden children are not counted', async () => {
    const { tree, f } = await liftReadme([]);

    dispatchKey(tree, 'ArrowRight');
    await f();
    expect(liveRegion('polite')?.textContent).toBe('Readme: under Documents, position 1.');

    dispatchKey(tree, ' ');
    await f();
    expect(liveRegion('assertive')?.textContent).toBe(
      'Dropped Readme under Documents, position 1.',
    );
  });

  it('still counts the children of an expanded parent', async () => {
    const { tree, f } = await liftReadme(['documents']);

    dispatchKey(tree, 'ArrowRight');
    await f();
    expect(liveRegion('polite')?.textContent).toBe('Readme: under Documents, position 3 of 3.');
  });
});

describe('ForTreeNodeDrag — a lifted session owns the keyboard (#2265)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  async function liftDocuments(): Promise<{
    instance: AppliedDropTreeHost;
    tree: HTMLElement;
    documents: HTMLElement;
    f: () => Promise<void>;
  }> {
    const { instance, query, flush: f } = renderHost(AppliedDropTreeHost);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const documents = query<HTMLElement>('[data-testid="documents"]')!;
    documents.focus();
    dispatchKey(documents, ' ', { ctrlKey: true });
    await f();
    return { instance, tree, documents, f };
  }

  it('consumes `*` so the lifted subtree stays collapsed and the drop cannot land inside it', async () => {
    const { instance, tree, documents, f } = await liftDocuments();
    expect(instance.open()).not.toContain('documents');

    const star = new KeyboardEvent('keydown', { key: '*', bubbles: true, cancelable: true });
    documents.dispatchEvent(star);
    await f();

    expect(star.defaultPrevented).toBe(true);
    expect(instance.open()).not.toContain('documents');

    for (const key of ['ArrowDown', 'ArrowRight', ' ']) {
      dispatchKey(tree, key);
      await f();
    }

    expect(instance.drops).toHaveLength(1);
    expect(instance.drops[0]!.node).toBe('documents');
    expect(['resume', 'projects', 'documents']).not.toContain(instance.drops[0]!.newParent);
  });

  it('offers no descendant of the lifted node as a drop row after a re-expansion through [(expanded)]', async () => {
    const { instance, tree, f } = await liftDocuments();

    instance.open.set(['documents']);
    await f();
    expect(tree.querySelector('[data-testid="resume"]')).not.toBeNull();

    for (const key of ['ArrowDown', 'ArrowRight', ' ']) {
      dispatchKey(tree, key);
      await f();
    }

    expect(instance.drops).toHaveLength(1);
    expect(instance.drops[0]!.newParent).toBe('readme');
  });

  it('never anchors the drop indicator on a re-expanded descendant of the lifted node', async () => {
    const { instance, tree, f } = await liftDocuments();

    instance.open.set(['documents']);
    await f();
    dispatchKey(tree, 'ArrowDown');
    await f();

    const anchored = Array.from(tree.querySelectorAll('[data-drop-position]')).map((n) =>
      n.getAttribute('data-testid'),
    );
    expect(anchored).toEqual(['readme']);
  });

  it('maps End to the last gap and Home to the first, keeping focus on the lifted node', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const music = query<HTMLElement>('[data-testid="music"]')!;

    music.focus();
    dispatchKey(music, ' ', { ctrlKey: true });
    await f();

    const end = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    music.dispatchEvent(end);
    await f();
    expect(end.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(music);
    expect(query('[data-testid="notes"]')!.getAttribute('data-drop-position')).toBe('after');

    dispatchKey(music, 'Home');
    await f();
    expect(document.activeElement).toBe(music);
    expect(query('[data-testid="docs"]')!.getAttribute('data-drop-position')).toBe('before');

    dispatchKey(tree, ' ');
    await f();
    expect(instance.dropped()).toEqual(
      expect.objectContaining({ node: 'music', newParent: null, currentIndex: 0 }),
    );
  });

  it('drops at the last root position after End', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const music = query<HTMLElement>('[data-testid="music"]')!;

    music.focus();
    dispatchKey(music, ' ', { ctrlKey: true });
    await f();
    dispatchKey(music, 'End');
    await f();
    dispatchKey(tree, ' ');
    await f();

    expect(instance.dropped()).toEqual(
      expect.objectContaining({ node: 'music', newParent: null, currentIndex: 2 }),
    );
  });

  it('consumes a typeahead character so focus stays on the lifted node', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();
    const docs = query<HTMLElement>('[data-testid="docs"]')!;

    docs.focus();
    dispatchKey(docs, ' ', { ctrlKey: true });
    await f();

    const letter = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true });
    docs.dispatchEvent(letter);
    await f();

    expect(letter.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(docs);
    expect(query('[forTree]')!.hasAttribute('data-dragging')).toBe(true);
  });

  it('leaves a Ctrl / Cmd chord to the browser', async () => {
    const { query, flush: f } = renderHost(TreeDragHost);
    await f();
    const docs = query<HTMLElement>('[data-testid="docs"]')!;

    docs.focus();
    dispatchKey(docs, ' ', { ctrlKey: true });
    await f();

    const chord = new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    docs.dispatchEvent(chord);

    expect(chord.defaultPrevented).toBe(false);
  });
});

describe('ForTreeNodeDrag — Escape cancels a pointer drag (#2265)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('cancels the drag, consumes the key, restores the expansion and drops nothing', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.open.set(['docs']);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const label =
      query<HTMLElement>('[data-testid="docs"]')!.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    firePointer(label, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    expect(tree.hasAttribute('data-dragging')).toBe(true);
    expect(instance.open()).not.toContain('docs');

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);
    await f();

    expect(escape.defaultPrevented).toBe(true);
    expect(tree.hasAttribute('data-dragging')).toBe(false);
    expect(instance.open()).toContain('docs');

    firePointer(document, 'pointerup', 100, 140);
    await f();
    expect(instance.dropped()).toBeNull();
  });

  it('leaves Escape alone for a press that never armed', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    await f();
    const label =
      query<HTMLElement>('[data-testid="docs"]')!.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    firePointer(label, 'pointerdown', 100, 100);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);
    firePointer(document, 'pointerup', 100, 100);
    await f();

    expect(escape.defaultPrevented).toBe(false);
    expect(instance.dropped()).toBeNull();
  });
});

describe('ForTreeNodeDrag — focus follows a pointer-dropped node that held focus (#2265)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('focuses the re-parented node in its new place, not the node before its old one', async () => {
    const { instance, query, flush: f } = renderHost(AppliedDropTreeHost);
    await f();
    const resume = query<HTMLElement>('[data-testid="resume"]')!;
    const label = resume.querySelector<HTMLElement>('[forTreeItemLabel]')!;
    resume.focus();

    firePointer(label, 'pointerdown', 100, 10);
    firePointer(document, 'pointermove', 100, -20);
    await f();
    firePointer(document, 'pointerup', 100, -20);
    await f();
    await f();

    expect(instance.drops).toEqual([
      expect.objectContaining({ node: 'resume', previousParent: 'documents', newParent: null }),
    ]);
    const moved = query<HTMLElement>('[data-testid="resume"]')!;
    expect(moved).not.toBe(resume);
    expect(document.activeElement).toBe(moved);
  });

  it('leaves focus alone when the dropped node did not hold it', async () => {
    const { instance, query, flush: f } = renderHost(AppliedDropTreeHost);
    await f();
    const readme = query<HTMLElement>('[data-testid="readme"]')!;
    const label =
      query<HTMLElement>('[data-testid="resume"]')!.querySelector<HTMLElement>(
        '[forTreeItemLabel]',
      )!;
    readme.focus();

    firePointer(label, 'pointerdown', 100, 10);
    firePointer(document, 'pointermove', 100, -20);
    await f();
    firePointer(document, 'pointerup', 100, -20);
    await f();
    await f();

    expect(instance.drops).toHaveLength(1);
    expect(document.activeElement).toBe(readme);
  });
});

describe('ForTreeNodeDrag — the pointer preview of an expanded parent (#2402)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('clones the collapsed row, not the subtree that was expanded at the press', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.open.set(['docs']);
    await f();
    const label =
      query<HTMLElement>('[data-testid="docs"]')!.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    firePointer(label, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();

    const preview = document.querySelector<HTMLElement>('[data-for-drag-preview]');
    expect(preview?.textContent).toContain('Docs');
    expect(preview!.querySelector('[role="group"]')).toBeNull();
    expect(preview!.textContent).not.toContain('Resume');

    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(document.querySelector('[data-for-drag-preview]')).toBeNull();
  });

  it('leaves no preview behind when the drag ends before the collapse renders', async () => {
    const { instance, query, flush: f } = renderHost(TreeDragHost);
    instance.open.set(['docs']);
    await f();
    const label =
      query<HTMLElement>('[data-testid="docs"]')!.querySelector<HTMLElement>('[forTreeItemLabel]')!;

    firePointer(label, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()!.node).toBe('docs');
    expect(document.querySelector('[data-for-drag-preview]')).toBeNull();
  });
});

@Component({
  imports: [
    ForTree,
    ForTreeNodeDrag,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
    ForTreeNodeDragHandle,
  ],
  template: `
    <ul
      forTree
      forTreeNodeDrag
      [(expanded)]="open"
      (nodeDrop)="dropped.set($event)"
      aria-label="Files"
    >
      <li forTreeItem value="projects" data-testid="projects">
        <div forTreeItemLabel data-testid="projects-label">
          <span forTreeItemToggle>▸</span>
          Projects
        </div>
        @if (open().includes('projects')) {
          <ul forTreeGroup>
            <li forTreeItem value="alpha" data-testid="alpha">
              <span forTreeNodeDragHandle data-testid="alpha-handle" aria-hidden="true">⠿</span>
              <div forTreeItemLabel data-testid="alpha-label">Alpha</div>
            </li>
          </ul>
        }
      </li>
      <li forTreeItem value="notes">
        <div forTreeItemLabel>Notes</div>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class FileHandlesTreeHost {
  readonly open = signal<readonly string[]>(['projects']);
  readonly dropped = signal<ForTreeDragDropEvent | null>(null);
}

describe('ForTreeNodeDrag — handles constrain only the item that owns them (#2402)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('drags a handle-less folder from its label while a child with a handle is expanded', async () => {
    const { instance, query, flush: f } = renderHost(FileHandlesTreeHost);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;

    firePointer(query<HTMLElement>('[data-testid="projects-label"]')!, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(true);

    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()!.node).toBe('projects');
  });

  it('still drags the child that carries a handle only from that handle', async () => {
    const { instance, query, flush: f } = renderHost(FileHandlesTreeHost);
    await f();

    firePointer(query<HTMLElement>('[data-testid="alpha-label"]')!, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()).toBeNull();

    firePointer(query<HTMLElement>('[data-testid="alpha-handle"]')!, 'pointerdown', 100, 100);
    firePointer(document, 'pointermove', 100, 120);
    await f();
    firePointer(document, 'pointerup', 100, 120);
    await f();

    expect(instance.dropped()!.node).toBe('alpha');
  });
});

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel],
  template: `
    <ul forTree forTreeNodeDrag [compareWith]="compare" aria-label="Files">
      @for (id of ids; track id) {
        <li forTreeItem [value]="id" [attr.data-testid]="id">
          <div forTreeItemLabel>{{ id }}</div>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class LongTreeDragHost {
  readonly ids = Array.from({ length: 300 }, (_, i) => `node-${i}`);
  compareCalls = 0;
  readonly compare = (a: string, b: string): boolean => {
    this.compareCalls += 1;
    return a === b;
  };
}

describe('ForTreeNodeDrag — the work a lift does grows linearly with the visible nodes (#2402)', () => {
  afterEach(() => {
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('calls the comparator a bounded number of times per visible node on a keyboard lift', async () => {
    const { instance, query, flush: f } = renderHost(LongTreeDragHost);
    await f();
    const tree = query<HTMLElement>('[forTree]')!;
    const last = query<HTMLElement>('[data-testid="node-299"]')!;
    last.focus();
    instance.compareCalls = 0;

    dispatchKey(last, 'Enter', { shiftKey: true });
    const liftCalls = instance.compareCalls;
    await f();

    expect(tree.hasAttribute('data-dragging')).toBe(true);
    expect(liftCalls).toBeLessThan(3 * instance.ids.length);
  });
});
