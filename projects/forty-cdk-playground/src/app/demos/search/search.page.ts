import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SearchDefaultExample } from './examples/default.example';
import { SearchFieldExample } from './examples/field.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/search/README.md';

@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, SearchDefaultExample, SearchFieldExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="search" [readme]="readme">
      <playground-demo
        title="Search with a clear button"
        subtitle="forSearch is a role='searchbox' input that mirrors its value to a signal. The companion [forSearchClear] takes the exported instance, self-hides while the field is empty, and refocuses the input after clearing — no extra @if needed."
        sourcePath="projects/forty-cdk-playground/src/app/demos/search/examples/default.example.ts"
      >
        <app-search-default-example />
      </playground-demo>

      <playground-demo
        title="Inside a Field with Signal Forms"
        subtitle="forSearch implements FormValueControl<string>, so [formField] auto-wires it inside forField exactly like forInput: the label adopts the control id, validation flows into aria-errormessage, and aria-invalid / aria-required are reflected. Type one or two characters and blur to surface the error."
        sourcePath="projects/forty-cdk-playground/src/app/demos/search/examples/field.example.ts"
      >
        <app-search-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SearchPage {
  protected readonly readme = readmeContent;
}
