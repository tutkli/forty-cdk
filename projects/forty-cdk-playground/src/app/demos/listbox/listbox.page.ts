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
        hero
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/default.example.ts"
      >
        <app-listbox-default-example />
      </playground-demo>

      <playground-demo
        title="Multi select"
        subtitle="<code>multiple</code> lets several options be selected and enables the APG range model: <kbd>Shift</kbd>+<kbd>Arrow</kbd> extends the selection, <kbd>Shift</kbd>+<kbd>Space</kbd> fills a range, and <kbd>Ctrl</kbd>+<kbd>A</kbd> toggles all."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/multi-select.example.ts"
      >
        <app-listbox-multi-select-example />
      </playground-demo>

      <playground-demo
        title="Option groups"
        subtitle='<code>forListboxGroup</code> wraps options in a <code>role="group"</code> labelled by <code>forListboxGroupLabel</code>. Grouping is advisory: arrow navigation, <kbd>Home</kbd>/<kbd>End</kbd>, and typeahead traverse across group boundaries in DOM order.'
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/groups.example.ts"
      >
        <app-listbox-groups-example />
      </playground-demo>

      <playground-demo
        title="Sortable (reorder)"
        subtitle="Add <code>[forListboxReorder]</code> for a selectable AND sortable list, with no <code>@angular/cdk/drag-drop</code>. Drag a chip to move it, or focus one and press <kbd>Ctrl</kbd>+<kbd>Space</kbd> to lift, arrows to position, <kbd>Space</kbd>/<kbd>Enter</kbd> to drop. <code>(optionReorder)</code> emits <code>{ from, to }</code>; you apply <code>moveItemInArray</code>."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/reorder.example.ts"
      >
        <app-listbox-reorder-example />
      </playground-demo>

      <playground-demo
        title="Signal Forms"
        subtitle="<code>ForListbox</code> implements <code>FormValueControl&lt;readonly T[]&gt;</code>, so a multi-select binds to a form field with one <code>[formField]</code> directive. The field requires at least one topic and reflects <code>data-invalid</code> until then, flipping <code>touched</code> once focus leaves it."
        sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/form-field.example.ts"
      >
        <app-listbox-form-field-example />
      </playground-demo>

      <playground-demo
        title="Virtualized (10,000 options)"
        subtitle="Setting <code>[totalCount]</code> switches <code>ForListbox</code> to the activedescendant model: the container becomes the single <kbd>Tab</kbd> stop and the active option is tracked by <code>aria-activedescendant</code>, so options recycle as you scroll. <kbd>Arrow</kbd> / <kbd>Home</kbd> / <kbd>End</kbd> reach options outside the rendered window via <code>(scrollToIndex)</code>."
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
