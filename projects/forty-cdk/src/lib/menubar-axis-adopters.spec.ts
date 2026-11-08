import { Component, signal } from '@angular/core';

import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import { pressKey } from 'forty-cdk/testing';

import { FOR_MENUBAR_FALLBACK_DEFAULTS } from '../../defaults/src/menubar-defaults';
import { afterEachOverlayCleanup, flushPositioning, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const SWITCH_CALL = /\.switchToSibling\(([^)]*)\)/g;
const SIDE_FALLBACK = /\.side\b(?:\(\))?\s*\?\?/g;
const ORIENTATION_BRANCH = /\borientation(?:\(\))?\s*[!=]==?\s*'(?:horizontal|vertical)'/;

function menuSources(): [string, string][] {
  return [...LIBRARY_CODE].filter(
    ([path]) => path.startsWith('menubar/src/') || path.startsWith('menu/src/'),
  );
}

describe('menubar axis adopters', () => {
  it('passes every switchToSibling call a direction the axis resolved', () => {
    const sites: string[] = [];
    for (const [path, code] of LIBRARY_CODE) {
      for (const match of code.matchAll(SWITCH_CALL)) {
        const arg = match[1]!.trim();
        sites.push(path);
        expect(arg, `${path}: switchToSibling(${arg})`).not.toMatch(/['"`]/);
        expect(
          /\b(?:resolveMenubarAxis|inMenuArrow)\(/.test(code),
          `${path} calls switchToSibling without resolving the bar's axis`,
        ).toBe(true);
      }
    }
    expect(sites.length).toBeGreaterThanOrEqual(3);
  });

  it('derives every menubar side fallback from the axis', () => {
    let count = 0;
    for (const [path, code] of LIBRARY_CODE) {
      if (!path.startsWith('menubar/src/')) {
        continue;
      }
      for (const match of code.matchAll(SIDE_FALLBACK)) {
        count++;
        const rest = code.slice(match.index);
        const chain = rest.slice(0, rest.search(/,\n|;\n/));
        expect(chain, `${path}: a side fallback that skips the axis`).toContain(
          'resolveMenubarAxis(',
        );
      }
    }
    expect(count).toBeGreaterThanOrEqual(2);
    expect(FOR_MENUBAR_FALLBACK_DEFAULTS.side).toBeNull();
  });

  it('branches on the bar orientation nowhere but the resolver', () => {
    const offenders = menuSources()
      .filter(([path]) => path !== 'menu/src/menu-separator.ts')
      .filter(([, code]) => ORIENTATION_BRANCH.test(code))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
    expect(menuSources().length).toBeGreaterThan(10);
  });
});

@Component({
  imports: [
    ForMenubar,
    ForMenubarTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forMenubar [(value)]="open" [orientation]="orientation()" [dir]="dir()" aria-label="Main">
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent id="file-menu">
          <button forMenuItem>New</button>
        </div>
      }
      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent id="edit-menu">
          <button id="edit-undo" forMenuItem>Undo</button>
          <div forMenuSub [(open)]="sub">
            <button id="edit-find" forMenuSubTrigger>Find</button>
            @if (sub()) {
              <div forMenuSubContent>
                <button id="edit-find-next" forMenuItem>Find next</button>
              </div>
            }
          </div>
        </div>
      }
      <button forMenubarTrigger value="view">View</button>
      @if (open() === 'view') {
        <div forMenuContent id="view-menu">
          <button forMenuItem>Zoom</button>
        </div>
      }
    </div>
  `,
})
class AxisHost {
  readonly open = signal<string | null>(null);
  readonly sub = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

interface Layout {
  readonly orientation: 'horizontal' | 'vertical';
  readonly dir: 'ltr' | 'rtl';
  readonly side: string;
  /** The open menu after the inline-start arrow on a top-level item of "Edit". */
  readonly itemStart: string | null;
  /** The open menu after the inline-end arrow on a top-level item of "Edit". */
  readonly itemEnd: string | null;
  /** The open menu after the inline-end arrow on an item of Edit's submenu. */
  readonly subItemEnd: string | null;
  /** The open menu after the inline-start arrow on Edit's sub-trigger. */
  readonly subTriggerStart: string | null;
}

const LAYOUTS: readonly Layout[] = [
  {
    orientation: 'horizontal',
    dir: 'ltr',
    side: 'bottom',
    itemStart: 'file',
    itemEnd: 'view',
    subItemEnd: 'view',
    subTriggerStart: 'file',
  },
  {
    orientation: 'horizontal',
    dir: 'rtl',
    side: 'bottom',
    itemStart: 'file',
    itemEnd: 'view',
    subItemEnd: 'view',
    subTriggerStart: 'file',
  },
  {
    orientation: 'vertical',
    dir: 'ltr',
    side: 'right',
    itemStart: null,
    itemEnd: 'edit',
    subItemEnd: 'edit',
    subTriggerStart: null,
  },
  {
    orientation: 'vertical',
    dir: 'rtl',
    side: 'left',
    itemStart: null,
    itemEnd: 'edit',
    subItemEnd: 'edit',
    subTriggerStart: null,
  },
];

describe.each(LAYOUTS)('menubar axis on a $orientation $dir bar', (layout) => {
  afterEachOverlayCleanup();

  const inlineStart = layout.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  const inlineEnd = layout.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';

  async function openEdit(sub = false) {
    const r = renderHost(AxisHost);
    r.instance.orientation.set(layout.orientation);
    r.instance.dir.set(layout.dir);
    r.instance.open.set('edit');
    r.instance.sub.set(sub);
    await flushPositioning(r.fixture);
    return r;
  }

  function editTrigger(r: Awaited<ReturnType<typeof openEdit>>): HTMLElement {
    return r.queryAll<HTMLElement>('[forMenubarTrigger]')[1]!;
  }

  it(`opens each menu on the ${layout.side} side`, async () => {
    const r = await openEdit();
    expect(document.getElementById('edit-menu')?.getAttribute('data-side')).toBe(layout.side);
    r.instance.open.set('file');
    await flushPositioning(r.fixture);
    expect(document.getElementById('file-menu')?.getAttribute('data-side')).toBe(layout.side);
  });

  it('routes the inline-start arrow on a top-level item per the axis', async () => {
    const r = await openEdit();
    const item = document.getElementById('edit-undo')!;
    item.focus();
    pressKey(item, inlineStart);
    await flushPositioning(r.fixture);
    expect(r.instance.open()).toBe(layout.itemStart);
    if (layout.itemStart === null) {
      expect(editTrigger(r).getAttribute('tabindex')).toBe('0');
    }
  });

  it('routes the inline-end arrow on a top-level item per the axis', async () => {
    const r = await openEdit();
    const item = document.getElementById('edit-undo')!;
    item.focus();
    const event = pressKey(item, inlineEnd);
    await flushPositioning(r.fixture);
    expect(r.instance.open()).toBe(layout.itemEnd);
    expect(event.defaultPrevented).toBe(layout.orientation === 'horizontal');
  });

  it('routes the inline-end arrow on a submenu item per the axis', async () => {
    const r = await openEdit(true);
    const item = document.getElementById('edit-find-next')!;
    item.focus();
    pressKey(item, inlineEnd);
    await flushPositioning(r.fixture);
    expect(r.instance.open()).toBe(layout.subItemEnd);
    expect(r.instance.sub()).toBe(layout.orientation === 'vertical');
  });

  it("routes the sub-trigger's close-parent arrow per the axis", async () => {
    const r = await openEdit();
    const subTrigger = document.getElementById('edit-find')!;
    subTrigger.focus();
    pressKey(subTrigger, inlineStart);
    await flushPositioning(r.fixture);
    expect(r.instance.open()).toBe(layout.subTriggerStart);
    if (layout.subTriggerStart === null) {
      expect(editTrigger(r).getAttribute('tabindex')).toBe('0');
    }
  });
});
