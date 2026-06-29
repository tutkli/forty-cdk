import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle } from 'forty-cdk/tree';
import { injectVirtualizer } from 'forty-cdk/virtualization';

interface TreeNode {
  readonly value: string;
  readonly label: string;
  readonly children?: readonly TreeNode[];
}

interface FlatNode {
  readonly value: string;
  readonly label: string;
  readonly level: number;
  readonly setSize: number;
  readonly posInSet: number;
  readonly expandable: boolean;
}

const ROOTS: readonly TreeNode[] = Array.from({ length: 300 }, (_, f) => ({
  value: `folder-${f}`,
  label: `Folder ${String(f + 1).padStart(3, '0')}`,
  children: Array.from({ length: 40 }, (_unused, c) => ({
    value: `file-${f}-${c}`,
    label: `file-${String(f + 1).padStart(3, '0')}-${String(c + 1).padStart(2, '0')}.ts`,
  })),
}));

function flatten(
  nodes: readonly TreeNode[],
  expanded: ReadonlySet<string>,
  level: number,
  out: FlatNode[],
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const expandable = !!node.children?.length;
    out.push({
      value: node.value,
      label: node.label,
      level,
      setSize: nodes.length,
      posInSet: i + 1,
      expandable,
    });
    if (expandable && expanded.has(node.value)) {
      flatten(node.children!, expanded, level + 1, out);
    }
  }
}

@Component({
  selector: 'app-tree-virtualized-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
  template: `
    <div class="vtree-stack">
      <div class="vtree-actions">
        <button type="button" class="btn" (click)="expandAll()">Expand all</button>
        <button type="button" class="btn" (click)="collapseAll()">Collapse all</button>
      </div>

      <ul
        forTree
        #scroll
        class="vtree"
        aria-label="Project files"
        [(value)]="selected"
        [(expanded)]="expanded"
        [totalCount]="flat().length"
        [visibleRange]="v.range()"
        (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
      >
        <div class="vtree-track" [style.height.px]="v.totalSize()">
          @for (vi of v.virtualItems(); track vi.key) {
            @let node = flat()[vi.index]!;
            <li
              forTreeItem
              class="vtree-item"
              [value]="node.value"
              [level]="node.level"
              [setSize]="node.setSize"
              [posInSet]="node.posInSet"
              [itemIndex]="vi.index"
              [style.transform]="'translateY(' + vi.start + 'px)'"
            >
              <span class="vtree-row" [style.padding-inline-start.rem]="0.5 + (node.level - 1)">
                @if (node.expandable) {
                  <span forTreeItemToggle class="vtree-toggle">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                } @else {
                  <span class="vtree-spacer"></span>
                }
                <span forTreeItemLabel class="vtree-label">{{ node.label }}</span>
              </span>
            </li>
          }
        </div>
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .vtree-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(360px, 100%);
    }

    .vtree-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--pg-surface-2);
    }

    .vtree {
      position: relative;
      width: 100%;
      max-height: 360px;
      overflow: auto;
      margin: 0;
      padding: 6px;
      list-style: none;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
      color: var(--pg-text);
    }

    .vtree:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: -2px;
    }

    .vtree-track {
      position: relative;
      width: 100%;
    }

    .vtree-item {
      position: absolute;
      inset-inline: 0;
      list-style: none;
    }

    .vtree-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      height: 32px;
      box-sizing: border-box;
      padding-inline-end: 0.5rem;
      border-radius: var(--pg-radius-sm);
      font-size: 0.875rem;
      cursor: pointer;
      user-select: none;
    }

    .vtree-item[data-highlighted] > .vtree-row,
    .vtree-row:hover {
      background: var(--pg-surface-2);
    }

    .vtree-item[data-selected] > .vtree-row {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .vtree-toggle {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.05rem;
      height: 1.05rem;
      color: var(--pg-text-muted);
    }

    .vtree-toggle svg {
      width: 1em;
      height: 1em;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.15s ease;
    }

    .vtree-toggle[data-state='open'] svg {
      transform: rotate(90deg);
    }

    .vtree-spacer {
      flex: none;
      width: 1.05rem;
    }

    .vtree-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .vtree-toggle svg {
        transition: none;
      }
    }
  `,
})
export class TreeVirtualizedExample {
  protected readonly selected = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(['folder-0']);

  protected readonly flat = computed<readonly FlatNode[]>(() => {
    const out: FlatNode[] = [];
    flatten(ROOTS, new Set(this.expanded()), 1, out);
    return out;
  });

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly v = injectVirtualizer({
    count: computed(() => this.flat().length),
    estimateSize: () => 32,
    scrollElement: this.scrollElement,
  });

  protected expandAll(): void {
    this.expanded.set(ROOTS.map((node) => node.value));
  }

  protected collapseAll(): void {
    this.expanded.set([]);
  }
}
