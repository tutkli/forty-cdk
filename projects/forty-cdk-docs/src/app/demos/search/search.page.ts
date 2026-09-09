import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { SearchDefaultExample } from './examples/default.example';
import { SearchFieldExample } from './examples/field.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/search.generated';

@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, SearchDefaultExample, SearchFieldExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="search" [doc]="doc">
      <playground-demo hero sourcePath="search/examples/default.example.ts">
        <app-search-default-example />
      </playground-demo>

      <playground-demo
        title="Inside a Field with Signal Forms"
        subtitle="<code>forSearch</code> implements <code>FormValueControl&lt;string&gt;</code>, so <code>[formField]</code> auto-wires it inside <code>forField</code> exactly like <code>forInput</code>: the label adopts the control id, validation flows into <code>aria-errormessage</code>, and <code>aria-invalid</code> / <code>aria-required</code> are reflected. Type one or two characters and blur to surface the error."
        sourcePath="search/examples/field.example.ts"
      >
        <app-search-field-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class SearchPage {
  protected readonly doc = DOC;
}
