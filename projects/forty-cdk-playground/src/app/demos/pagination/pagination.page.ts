import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { PaginationDataExample } from './examples/data.example';
import { PaginationDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/pagination/README.md';

@Component({
  selector: 'app-pagination-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, PaginationDefaultExample, PaginationDataExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="pagination" [readme]="readme">
      <playground-demo hero sourcePath="pagination/examples/default.example.ts">
        <app-pagination-default-example />
      </playground-demo>

      <playground-demo
        title="Driving a data list"
        subtitle="Pagination is headless state — derive <code>count</code> from your data, then slice the visible rows from <code>page()</code>. Changing the page re-slices the list; the <code>page</code> model is the single source of truth shared by the rows and the controls."
        sourcePath="pagination/examples/data.example.ts"
      >
        <app-pagination-data-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class PaginationPage {
  protected readonly readme = readmeContent;
}
