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
      <demo-layout hero sourcePath="search/examples/default.example.ts">
        <app-search-default-example />
      </demo-layout>

      <demo-layout
        heading="inside-a-field-with-signal-forms"
        sourcePath="search/examples/field.example.ts"
      >
        <app-search-field-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class SearchPage {
  protected readonly doc = DOC;
}
