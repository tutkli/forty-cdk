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
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/default.example.ts"
      >
        <app-dropdown-menu-default-example />
      </playground-demo>

      <playground-demo
        title="Checkbox & radio items"
        subtitle="A settings-style dropdown built from the full menu vocabulary: <code>forMenuGroup</code> with a <code>forMenuGroupLabel</code> header, <code>forMenuCheckboxItem</code> toggles (role <code>menuitemcheckbox</code>) and a <code>forMenuRadioGroup</code> of <code>forMenuRadioItem</code> options (role <code>menuitemradio</code>). Each item carries a <code>forMenuItemIndicator</code> that paints its checkmark / dot from the item's checked state. Calling <code>preventDefault()</code> on <code>(activate)</code> keeps the menu open so several options can be flipped in one pass — try <kbd>Space</kbd> to toggle without closing."
        sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/checkbox-radio.example.ts"
      >
        <app-dropdown-menu-checkbox-radio-example />
      </playground-demo>

      <playground-demo
        title="Submenus"
        subtitle="<code>forMenuSub</code> nests a second menu under a <code>forMenuSubTrigger</code> item (role <code>menuitem</code>, <code>aria-haspopup=menu</code>). The submenu owns its own open model and item collection, and its <code>forMenuSubContent</code> reuses the menu surface positioned to the side of the trigger. Submenus nest arbitrarily — here a third level sits inside the second. <kbd>ArrowRight</kbd> opens a submenu and focuses its first item; <kbd>ArrowLeft</kbd> collapses back to the parent; <kbd>Escape</kbd> closes one level at a time."
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
