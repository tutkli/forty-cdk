import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { ListboxDefaultExample } from './examples/default.example';
import { ListboxFormFieldExample } from './examples/form-field.example';
import { ListboxGroupsExample } from './examples/groups.example';
import { ListboxMultiSelectExample } from './examples/multi-select.example';
import { ListboxReorderExample } from './examples/reorder.example';
import { ListboxVirtualizedExample } from './examples/virtualized.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/listbox/README.md';

@Component({
  selector: 'app-listbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PrimitivePage,
    DemoLayout,
    ListboxDefaultExample,
    ListboxMultiSelectExample,
    ListboxGroupsExample,
    ListboxReorderExample,
    ListboxFormFieldExample,
    ListboxVirtualizedExample,
  ],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="listbox" [readme]="readme">
      <playground-demo
        title="Single select"
        subtitle="An inline, roving-tabindex listbox (no popup). Tab moves focus into the list; arrows roam and wrap, Home/End jump to the ends, and typeahead matches visible text. The trailing checkmark self-hides while an option is unselected."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/default.example.ts"
      >
        <app-listbox-default-example />
      </playground-demo>

      <playground-demo
        title="Multi select"
        subtitle="multiple lets several options be selected and enables the APG range model: Shift+Arrow extends the selection, Shift+Space fills a range, and Ctrl+A toggles all."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/multi-select.example.ts"
      >
        <app-listbox-multi-select-example />
      </playground-demo>

      <playground-demo
        title="Option groups"
        subtitle="forListboxGroup wraps options in a role=group labelled by forListboxGroupLabel. Grouping is advisory: arrow navigation, Home/End, and typeahead traverse across group boundaries in DOM order."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/groups.example.ts"
      >
        <app-listbox-groups-example />
      </playground-demo>

      <playground-demo
        title="Sortable (reorder)"
        subtitle="Add [forListboxReorder] for a selectable AND sortable list, with no @angular/cdk/drag-drop. Drag a chip to move it, or focus one and press Ctrl+Space to lift, arrows to position, Space/Enter to drop. (optionReorder) emits { from, to }; you apply moveItemInArray."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/reorder.example.ts"
      >
        <app-listbox-reorder-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="forListbox implements FormValueControl<readonly T[]>, so a multi-select binds to a form field with one [formField] directive. The field requires at least one topic and reflects data-invalid until then, flipping touched once focus leaves it."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/form-field.example.ts"
      >
        <app-listbox-form-field-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (10,000 options)"
        subtitle="Setting [totalCount] switches ForListbox to the activedescendant model: the container becomes the single Tab stop and the active option is tracked by aria-activedescendant, so options recycle as you scroll. Arrow / Home / End reach options outside the rendered window via (scrollToIndex)."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/virtualized.example.ts"
      >
        <app-listbox-virtualized-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class ListboxPage {
  protected readonly readme = readmeContent;
}
