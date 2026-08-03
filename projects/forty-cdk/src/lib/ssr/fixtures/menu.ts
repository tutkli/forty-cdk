import { Component } from '@angular/core';
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
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
  ForNavigationMenuViewport,
} from 'forty-cdk/navigation-menu';

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
  ],
  template: `
    <nav forNavigationMenu value="products">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          <div forNavigationMenuContent>
            <a href="/web" forNavigationMenuLink>Web</a>
          </div>
        </li>
      </ul>
    </nav>
  `,
})
export class NavigationMenuOpenFixture {}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
    ForNavigationMenuViewport,
  ],
  template: `
    <nav forNavigationMenu value="products">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger>Products</button>
          <div forNavigationMenuContent>
            <a href="/web" forNavigationMenuLink>Web</a>
          </div>
        </li>
      </ul>
      <div forNavigationMenuViewport></div>
    </nav>
  `,
})
export class NavigationMenuViewportOpenFixture {}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenubar value="file" ariaLabel="Main">
      <button forMenubarTrigger value="file">File</button>
      <div forMenuContent>
        <button forMenuItem>New</button>
      </div>
    </div>
  `,
})
export class MenubarOpenFixture {}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Options</button>
      <div forMenuContent>
        <button forMenuItem>Cut</button>
      </div>
    </div>
  `,
})
export class DropdownMenuOpenFixture {}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Options</button>
      <div forMenuContent>
        <button forMenuItem>Cut</button>
        <div forMenuSub [open]="true">
          <button forMenuSubTrigger>More tools</button>
          <div forMenuSubContent>
            <button forMenuItem>Developer tools</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MenuSubOpenFixture {}

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forContextMenu [open]="true">
      <div forContextMenuTrigger>Right-click here</div>
      <div forMenuContent>
        <button forMenuItem>Rename</button>
      </div>
    </div>
  `,
})
export class ContextMenuOpenFixture {}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu #row="forMenu" [open]="true" ariaLabel="Row actions">
      <div data-opener="region" [forContextMenuTrigger]="row">Row</div>
      <button data-opener="kebab" [forDropdownMenuTrigger]="row">⋮</button>
      <div forMenuContent>
        <button forMenuItem>Edit</button>
      </div>
    </div>
  `,
})
export class MenuMultiOpenerOpenFixture {}
