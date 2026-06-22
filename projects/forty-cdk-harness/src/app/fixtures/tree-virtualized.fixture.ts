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
  readonly childCount: number;
}

interface FlatNode {
  readonly value: string;
  readonly label: string;
  readonly level: number;
  readonly setSize: number;
  readonly posInSet: number;
  readonly itemIndex: number;
  readonly expandable: boolean;
}

const ROOT_COUNT = 50;
const CHILD_COUNT = 50;

function buildRoots(): TreeNode[] {
  return Array.from({ length: ROOT_COUNT }, (_, r) => ({
    value: `root-${r}`,
    label: `Root ${r}`,
    childCount: CHILD_COUNT,
  }));
}

function buildFlat(roots: TreeNode[], expanded: ReadonlySet<string>): FlatNode[] {
  const result: FlatNode[] = [];
  for (let r = 0; r < roots.length; r++) {
    const root = roots[r]!;
    result.push({
      value: root.value,
      label: root.label,
      level: 1,
      setSize: roots.length,
      posInSet: r + 1,
      itemIndex: result.length,
      expandable: root.childCount > 0,
    });
    if (expanded.has(root.value)) {
      for (let c = 0; c < root.childCount; c++) {
        const childValue = `child-${r}-${c}`;
        result.push({
          value: childValue,
          label: `Child ${r}-${c}`,
          level: 2,
          setSize: root.childCount,
          posInSet: c + 1,
          itemIndex: result.length,
          expandable: false,
        });
      }
    }
  }
  return result;
}

@Component({
  selector: 'app-tree-virtualized-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
  template: `
    <ul
      forTree
      #scroll
      data-testid="tree"
      aria-label="Virtualized tree"
      [(value)]="value"
      [(expanded)]="expanded"
      [totalCount]="flat().length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
      style="overflow: auto; max-height: 400px; position: relative;"
    >
      <div [style.height.px]="v.totalSize()" style="position: relative">
        @for (vi of v.virtualItems(); track vi.key) {
          <li
            forTreeItem
            data-testid="treeitem"
            [value]="flat()[vi.index]!.value"
            [level]="flat()[vi.index]!.level"
            [setSize]="flat()[vi.index]!.setSize"
            [posInSet]="flat()[vi.index]!.posInSet"
            [itemIndex]="vi.index"
            [attr.data-index]="vi.index"
            [attr.data-value]="flat()[vi.index]!.value"
            [style.transform]="'translateY(' + vi.start + 'px)'"
            style="position: absolute; left: 0; right: 0;"
          >
            <div forTreeItemLabel>
              @if (flat()[vi.index]!.expandable) {
                <span forTreeItemToggle>▸</span>
              }
              {{ flat()[vi.index]!.label }}
            </div>
          </li>
        }
      </div>
    </ul>
  `,
})
export class TreeVirtualizedFixture {
  private readonly roots = buildRoots();

  protected readonly value = signal<readonly string[]>([]);
  protected readonly expanded = signal<readonly string[]>(this.roots.map((r) => r.value));

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  protected readonly flat = computed(() => buildFlat(this.roots, new Set(this.expanded())));

  protected readonly v = injectVirtualizer({
    count: computed(() => this.flat().length),
    estimateSize: () => 32,
    scrollElement: this.scrollElement,
  });
}
