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
      <playground-demo
        title="Page navigation with ellipsis"
        subtitle="forPagination derives the visible page list — boundaryCount pages pinned at each end, siblingCount around the current page, the rest collapsed into ellipsis gaps. Previous / Next get the native disabled attribute at the bounds; the active page reflects aria-current='page'."
        sourcePath="projects/forty-cdk-playground/src/app/demos/pagination/examples/default.example.ts"
      >
        <app-pagination-default-example />
      </playground-demo>

      <playground-demo
        title="Driving a data list"
        subtitle="Pagination is headless state — derive the page count from your data, then slice the visible rows from page(). Changing the page re-slices the list; the page model is the single source of truth shared by the rows and the controls."
        sourcePath="projects/forty-cdk-playground/src/app/demos/pagination/examples/data.example.ts"
      >
        <app-pagination-data-example />
      </playground-demo>
    </primitive-page>
  `,
})
export class PaginationPage {
  protected readonly readme = readmeContent;
}
