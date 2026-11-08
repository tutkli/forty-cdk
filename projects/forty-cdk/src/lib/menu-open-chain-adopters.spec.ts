import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenu,
  ForMenuContent,
  ForMenuItem,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import { pointerEvent, pressKey } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, type RenderResult, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const SUBMENU_PIECES = [ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger];

interface ChainHost {
  readonly subOpen: WritableSignal<boolean>;
  openRoot(): void;
  closeRoot(): void;
}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ...SUBMENU_PIECES],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button data-root-trigger forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <button id="cut" forMenuItem>Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div id="sub-content" forMenuSubContent>
                <button forMenuItem>Advanced</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class DropdownChainHost implements ChainHost {
  readonly open = signal(false);
  readonly subOpen = signal(false);
  openRoot(): void {
    this.open.set(true);
  }
  closeRoot(): void {
    this.open.set(false);
  }
}

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ...SUBMENU_PIECES],
  template: `
    <div forContextMenu [(open)]="open">
      <div forContextMenuTrigger>Region</div>
      @if (open()) {
        <div forMenuContent>
          <button id="cut" forMenuItem>Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div id="sub-content" forMenuSubContent>
                <button forMenuItem>Advanced</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class ContextMenuChainHost implements ChainHost {
  readonly open = signal(false);
  readonly subOpen = signal(false);
  openRoot(): void {
    this.open.set(true);
  }
  closeRoot(): void {
    this.open.set(false);
  }
}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ...SUBMENU_PIECES],
  template: `
    <div forMenu #row="forMenu" [(open)]="open" ariaLabel="Row actions">
      <button data-root-trigger [forDropdownMenuTrigger]="row">Actions</button>
      @if (open()) {
        <div forMenuContent>
          <button id="cut" forMenuItem>Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div id="sub-content" forMenuSubContent>
                <button forMenuItem>Advanced</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class SharedMenuChainHost implements ChainHost {
  readonly open = signal(false);
  readonly subOpen = signal(false);
  openRoot(): void {
    this.open.set(true);
  }
  closeRoot(): void {
    this.open.set(false);
  }
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ...SUBMENU_PIECES],
  template: `
    <div forMenubar [(value)]="value" aria-label="Main">
      <button forMenubarTrigger value="file">File</button>
      @if (value() === 'file') {
        <div forMenuContent>
          <button id="cut" forMenuItem>Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div id="sub-content" forMenuSubContent>
                <button forMenuItem>Advanced</button>
              </div>
            }
          </div>
        </div>
      }
      <button data-edit-trigger forMenubarTrigger value="edit">Edit</button>
      @if (value() === 'edit') {
        <div forMenuContent>
          <button id="undo" forMenuItem>Undo</button>
        </div>
      }
    </div>
  `,
})
class MenubarChainHost implements ChainHost {
  readonly value = signal<string | null>(null);
  readonly subOpen = signal(false);
  openRoot(): void {
    this.value.set('file');
  }
  closeRoot(): void {
    this.value.set(null);
  }
}

type ClosePath = (r: RenderResult<ChainHost>) => void;

function query(selector: string): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

const tabOnParentItem: ClosePath = () => pressKey(query('#cut'), 'Tab');
const activateParentItem: ClosePath = () => query('#cut').click();
const consumerCloseWrite: ClosePath = (r) => r.instance.closeRoot();
const rootTriggerClick: ClosePath = () => {
  const trigger = query('[data-root-trigger]');
  trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  trigger.click();
};

/**
 * Every menu context that can hold a `[forMenuSub]`, keyed by the file that
 * implements it, with the paths that close it while a bound submenu is open.
 */
const ROOTS: Record<string, { host: Type<ChainHost>; paths: Record<string, ClosePath> }> = {
  'dropdown-menu/src/dropdown-menu.ts': {
    host: DropdownChainHost,
    paths: {
      'a click on the root trigger': rootTriggerClick,
      'Tab on a parent item': tabOnParentItem,
      'activating a parent item': activateParentItem,
      'a consumer write of false': consumerCloseWrite,
    },
  },
  'context-menu/src/context-menu.ts': {
    host: ContextMenuChainHost,
    paths: {
      'Tab on a parent item': tabOnParentItem,
      'activating a parent item': activateParentItem,
      'a consumer write of false': consumerCloseWrite,
    },
  },
  'menu/src/menu.ts': {
    host: SharedMenuChainHost,
    paths: {
      'a click on an opener': rootTriggerClick,
      'Tab on a parent item': tabOnParentItem,
      'activating a parent item': activateParentItem,
      'a consumer write of false': consumerCloseWrite,
    },
  },
  'menubar/src/menubar-menu-context.ts': {
    host: MenubarChainHost,
    paths: {
      'Tab on a parent item': tabOnParentItem,
      'activating a parent item': activateParentItem,
      'a consumer write of null': consumerCloseWrite,
      'ArrowRight on a parent item switching menus': () => pressKey(query('#cut'), 'ArrowRight'),
      "the sub-trigger's close-parent key switching menus": () =>
        pressKey(query('#more'), 'ArrowLeft'),
      'a hover on another trigger switching menus': () =>
        query('[data-edit-trigger]').dispatchEvent(
          pointerEvent('pointerenter', { pointerType: 'mouse' }),
        ),
      'a consumer write switching menus': (r) => (r.instance as MenubarChainHost).value.set('edit'),
    },
  },
};

describe('closing a menu closes the submenu open below it', () => {
  afterEachOverlayCleanup();

  for (const [file, { host, paths }] of Object.entries(ROOTS)) {
    describe(file, () => {
      for (const [path, close] of Object.entries(paths)) {
        it(`${path} writes the bound submenu closed, and the next open mounts no submenu`, async () => {
          const r = renderHost<ChainHost>(host);
          r.instance.openRoot();
          await flush(r.fixture);
          r.instance.subOpen.set(true);
          await flush(r.fixture);
          query('#cut').focus();
          await flush(r.fixture);
          expect(document.querySelector('#sub-content')).not.toBeNull();

          close(r);
          await flush(r.fixture);

          expect(r.instance.subOpen()).toBe(false);

          r.instance.openRoot();
          await flush(r.fixture);

          expect(document.querySelector('#cut')).not.toBeNull();
          expect(document.querySelector('#sub-content')).toBeNull();
        });
      }
    });
  }
});

describe('the open-child chain has one owner', () => {
  const contexts = [...LIBRARY_CODE]
    .filter(([, code]) => /\bclass\s+\w+[^{]*\bimplements\b[^{]*\bForMenuContext\b/.test(code))
    .map(([path]) => path)
    .sort();

  it('every menu context but [forMenuSub] has a case above, and [forMenuSub] closes its own chain', () => {
    expect(contexts).toEqual([...Object.keys(ROOTS), 'menu/src/menu-sub.ts'].sort());
  });

  it('every menu context routes its close through closeOpenChildChain', () => {
    expect(LIBRARY_CODE.get('core-anchored/src/menu-overlay/menu-overlay.ts')).toMatch(
      /onClose: \(reason, options\) => \{\s*openChain\.closeOpenChildChain\(hooks\.context\);/,
    );
    for (const path of contexts) {
      const code = LIBRARY_CODE.get(path)!;
      const routed =
        /createMenuOverlay\('[a-z-]+', \{\s*context: this,/.test(code) ||
        /onClose: \(\) => this\.closeOpenSubmenus\(\)/.test(code);
      expect(routed, path).toBe(true);
    }
  });

  it('no piece keeps an open-child map of its own', () => {
    const owners = [...LIBRARY_CODE]
      .filter(([, code]) => /Map<\s*ForMenuContext\b/.test(code))
      .map(([path]) => path);
    expect(owners).toEqual(['core-anchored/src/menu-overlay/menu-open-chain.ts']);
  });
});
