import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItem,
  ForMenuRadioGroup,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuRadioGroup,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDropdownMenu [(open)]="open">
    <button forDropdownMenuTrigger id="probe-trigger">Options</button>
    @if (open()) {
      <div
        forMenuContent
        id="probe-content"
        aria-label="Probe row actions"
        aria-labelledby="probe-labelledby"
      >
        <div forMenuGroup aria-labelledby="probe-group-labelledby">
          <div forMenuGroupLabel id="probe-group-label">Group</div>
          <button forMenuItem>A</button>
        </div>
        <div forMenuRadioGroup [(value)]="choice" aria-labelledby="probe-radio-labelledby">
          <button forMenuItem>B</button>
        </div>
        <div forMenuSub [(open)]="subOpen">
          <button forMenuSubTrigger id="probe-sub-trigger">More</button>
          @if (subOpen()) {
            <div forMenuSubContent>
              <button forMenuItem>C</button>
            </div>
          }
        </div>
      </div>
    }
  </div>`,
})
class DropdownMenuAdopted {
  readonly open = signal(true);
  readonly subOpen = signal(true);
  readonly choice = signal('');
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuRadioGroup,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDropdownMenu [(open)]="open">
    <button forDropdownMenuTrigger>Options</button>
    @if (open()) {
      <div forMenuContent>
        <div forMenuGroup>
          <div forMenuGroupLabel>Group</div>
          <button forMenuItem>A</button>
        </div>
        <div forMenuRadioGroup [(value)]="choice">
          <button forMenuItem>B</button>
        </div>
        <div forMenuSub [(open)]="subOpen">
          <button forMenuSubTrigger>More</button>
          @if (subOpen()) {
            <div forMenuSubContent>
              <button forMenuItem>C</button>
            </div>
          }
        </div>
      </div>
    }
  </div>`,
})
class DropdownMenuBare {
  readonly open = signal(true);
  readonly subOpen = signal(true);
  readonly choice = signal('');
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forMenubar [(value)]="value" aria-label="Probe main">
    <button forMenubarTrigger value="file" id="probe-trigger">File</button>
    @if (value() === 'file') {
      <div forMenuContent id="probe-content">
        <button forMenuItem>New</button>
      </div>
    }
  </div>`,
})
class MenubarAdopted {
  readonly value = signal<string | null>('file');
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forMenubar [(value)]="value">
    <button forMenubarTrigger value="file">File</button>
    @if (value() === 'file') {
      <div forMenuContent>
        <button forMenuItem>New</button>
      </div>
    }
  </div>`,
})
class MenubarBare {
  readonly value = signal<string | null>('file');
}

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forContextMenu [(open)]="open">
    <div forContextMenuTrigger id="probe-trigger">Right-click</div>
    @if (open()) {
      <div forMenuContent>
        <button forMenuItem>A</button>
      </div>
    }
  </div>`,
})
class ContextMenuAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forContextMenu [(open)]="open">
    <div forContextMenuTrigger>Right-click</div>
    @if (open()) {
      <div forMenuContent>
        <button forMenuItem>A</button>
      </div>
    }
  </div>`,
})
class ContextMenuBare {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forNavigationMenu [(value)]="value" aria-label="Probe site">
    <ul forNavigationMenuList>
      <li forNavigationMenuItem value="products">
        <button forNavigationMenuTrigger id="probe-trigger">Products</button>
        @if (value() === 'products') {
          <div forNavigationMenuContent id="probe-content" aria-labelledby="probe-labelledby">
            Panel
          </div>
        }
      </li>
    </ul>
  </nav>`,
})
class NavigationMenuAdopted {
  readonly value = signal<string | null>('products');
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forNavigationMenu [(value)]="value">
    <ul forNavigationMenuList>
      <li forNavigationMenuItem value="products">
        <button forNavigationMenuTrigger>Products</button>
        @if (value() === 'products') {
          <div forNavigationMenuContent>Panel</div>
        }
      </li>
    </ul>
  </nav>`,
})
class NavigationMenuBare {
  readonly value = signal<string | null>('products');
}

/**
 * The menu family: every opener owns an id, every surface names itself after
 * the opener that opened it, and the group / radio-group label follows the
 * collection shape.
 */
export const MENU_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'DropdownMenu / Menu',
    adopted: DropdownMenuAdopted,
    bare: DropdownMenuBare,
    claims: [
      {
        key: '[forDropdownMenuTrigger]',
        channel: 'id',
        source: 'dropdown-menu/src/dropdown-menu-trigger.ts',
        seam: 'hostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-dropdown-menu-trigger' },
      },
      {
        key: '[forMenuContent]',
        channel: 'id',
        source: 'core/src/menu-overlay/menu-opener-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-dropdown-menu-content' },
      },
      {
        key: '[forMenuGroupLabel]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-group-label',
        fallback: { generated: 'for-menu-group-label' },
      },
      {
        key: '[forMenuGroup]',
        channel: 'aria-labelledby',
        source: 'menu/src/menu-group.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-group-labelledby',
        fallback: { pairs: '[forMenuGroupLabel]' },
      },
      {
        key: '[forMenuRadioGroup]',
        channel: 'aria-labelledby',
        source: 'menu/src/menu-radio-group.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-radio-labelledby',
        fallback: null,
      },
      {
        key: '[forMenuContent]',
        channel: 'aria-labelledby',
        source: 'menu/src/menu-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forDropdownMenuTrigger]' },
      },
      {
        key: '[forMenuContent]',
        channel: 'aria-label',
        source: 'menu/src/menu-content.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe row actions',
        fallback: null,
      },
      {
        key: '[forMenuSubTrigger]',
        channel: 'id',
        source: 'core/src/menu-overlay/menu-opener-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-sub-trigger',
        fallback: { generated: 'for-menu-sub-trigger' },
      },
    ],
  },
  {
    label: 'Menubar',
    adopted: MenubarAdopted,
    bare: MenubarBare,
    claims: [
      {
        key: '[forMenubarTrigger]',
        channel: 'id',
        source: 'menubar/src/menubar-trigger.ts',
        seam: 'hostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-menubar-trigger' },
      },
      {
        key: '[forMenuContent]',
        channel: 'id',
        source: 'menubar/src/menubar-trigger.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-menubar-content' },
      },
      {
        key: '[forMenubar]',
        channel: 'aria-label',
        source: 'menubar/src/menubar.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe main',
        fallback: null,
      },
    ],
  },
  {
    label: 'ContextMenu',
    adopted: ContextMenuAdopted,
    bare: ContextMenuBare,
    claims: [
      {
        key: '[forContextMenuTrigger]',
        channel: 'id',
        source: 'context-menu/src/context-menu-trigger.ts',
        seam: 'hostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-context-menu-trigger' },
      },
    ],
  },
  {
    label: 'NavigationMenu',
    adopted: NavigationMenuAdopted,
    bare: NavigationMenuBare,
    claims: [
      {
        key: '[forNavigationMenuTrigger]',
        channel: 'id',
        source: 'navigation-menu/src/navigation-menu-trigger.ts',
        seam: 'hostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-navigation-menu-trigger' },
      },
      {
        key: '[forNavigationMenuContent]',
        channel: 'id',
        source: 'navigation-menu/src/navigation-menu-content.ts',
        seam: 'hostId',
        probe: 'probe-content',
        fallback: { generated: 'for-navigation-menu-content' },
      },
      {
        key: '[forNavigationMenuContent]',
        channel: 'aria-labelledby',
        source: 'navigation-menu/src/navigation-menu-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forNavigationMenuTrigger]' },
      },
      {
        key: '[forNavigationMenu]',
        channel: 'aria-label',
        source: 'navigation-menu/src/navigation-menu.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe site',
        fallback: null,
      },
    ],
  },
];
