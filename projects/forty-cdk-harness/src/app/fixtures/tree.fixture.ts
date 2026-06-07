import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
} from 'forty-cdk';

import { queryFlag } from './_query-flag';

interface FileNode {
  id: string;
  name: string;
  children?: FileNode[];
}

const ROOTS: FileNode[] = [
  {
    id: 'documents',
    name: 'Documents',
    children: [
      { id: 'resume', name: 'Resume' },
      {
        id: 'projects',
        name: 'Projects',
        children: [
          { id: 'alpha', name: 'Alpha' },
          { id: 'beta', name: 'Beta' },
        ],
      },
    ],
  },
  {
    id: 'music',
    name: 'Music',
    children: [{ id: 'rock', name: 'Rock' }],
  },
  { id: 'notes', name: 'Notes' },
];

@Component({
  selector: 'app-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup, TreeNode],
  host: { style: 'display: contents' },
  template: `
    <li
      forTreeItem
      [value]="node().id"
      [disabled]="disabled().includes(node().id)"
      [attr.data-testid]="'item-' + node().id"
    >
      <div forTreeItemLabel [attr.data-testid]="'label-' + node().id">
        @if (node().children?.length) {
          <span forTreeItemToggle [attr.data-testid]="'toggle-' + node().id">▸</span>
        }
        {{ node().name }}
      </div>

      @if (node().children?.length && expanded().includes(node().id)) {
        <ul forTreeGroup>
          @for (child of node().children ?? []; track child.id) {
            <app-tree-node [node]="child" [expanded]="expanded()" [disabled]="disabled()" />
          }
        </ul>
      }
    </li>
  `,
})
export class TreeNode {
  readonly node = input.required<FileNode>();
  readonly expanded = input.required<readonly string[]>();
  readonly disabled = input.required<readonly string[]>();
}

@Component({
  selector: 'app-tree-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, TreeNode],
  template: `
    <input data-testid="before" placeholder="before-tree" />
    <button data-testid="disable-notes" type="button" (click)="disableNotes()">disable</button>
    <ul
      forTree
      [(value)]="picked"
      [(expanded)]="open"
      [multiple]="multiple"
      [selectionFollowsFocus]="follow"
      [dir]="dir"
      aria-label="File system"
    >
      @for (n of roots; track n.id) {
        <app-tree-node [node]="n" [expanded]="open()" [disabled]="disabledNodes()" />
      }
    </ul>
    <input data-testid="after" placeholder="after-tree" />
  `,
})
export class TreeFixture {
  protected readonly roots = ROOTS;
  protected readonly picked = signal<readonly string[]>([]);
  protected readonly open = signal<readonly string[]>(
    queryFlag('expandAll') ? ['documents', 'projects'] : [],
  );

  protected readonly multiple = queryFlag('multiple');
  protected readonly follow = queryFlag('selectionFollowsFocus');
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';
  protected readonly disabledNodes = signal<readonly string[]>(
    queryFlag('disableMusic') ? ['music'] : [],
  );

  protected disableNotes(): void {
    this.disabledNodes.update((ids) => (ids.includes('notes') ? ids : [...ids, 'notes']));
  }
}
