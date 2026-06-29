import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { DropdownMenuCheckboxRadioExample } from './examples/checkbox-radio.example';
import { DropdownMenuDefaultExample } from './examples/default.example';
import { DropdownMenuSubmenusExample } from './examples/submenus.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/dropdown-menu/README.md';

@Component({
  selector: 'app-dropdown-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    DropdownMenuDefaultExample,
    DropdownMenuCheckboxRadioExample,
    DropdownMenuSubmenusExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="dropdown-menu" [readme]="readme">
      <playground-demo
        title="Button-triggered menu"
        subtitle="A button-triggered menu positioned by floating-ui, with full keyboard support: arrows move between items, typeahead jumps to a label, Home/End reach the ends. It dismisses on Escape, outside pointer-down and Tab, returning focus to the trigger. The surface portals to <body>; its styles are colocated here via ViewEncapsulation.None."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/default.example.ts"
      >
        <app-dropdown-menu-default-example />
      </playground-demo>

      <playground-demo
        title="Checkbox & radio items"
        subtitle="A settings-style dropdown built from the full menu vocabulary: forMenuGroup with a forMenuGroupLabel header, forMenuCheckboxItem toggles (role menuitemcheckbox) and a forMenuRadioGroup of forMenuRadioItem options (role menuitemradio). Each item carries a forMenuItemIndicator that paints its checkmark / dot from the item's checked state. Calling preventDefault() on (activate) keeps the menu open so several options can be flipped in one pass — try Space to toggle without closing."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/checkbox-radio.example.ts"
      >
        <app-dropdown-menu-checkbox-radio-example />
      </playground-demo>

      <playground-demo
        title="Submenus"
        subtitle="forMenuSub nests a second menu under a forMenuSubTrigger item (role menuitem, aria-haspopup=menu). The submenu owns its own open model and item collection, and its forMenuSubContent reuses the menu surface positioned to the side of the trigger. Submenus nest arbitrarily — here a third level sits inside the second. ArrowRight opens a submenu and focuses its first item; ArrowLeft collapses back to the parent; Escape closes one level at a time."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/submenus.example.ts"
      >
        <app-dropdown-menu-submenus-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class DropdownMenuPage {
  protected readonly readme = readmeContent;
}
