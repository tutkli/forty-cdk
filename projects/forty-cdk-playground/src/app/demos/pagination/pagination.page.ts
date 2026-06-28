import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { PaginationBasicExample } from './examples/basic.example';
import { PaginationDataExample } from './examples/data.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/pagination/README.md';

@Component({
  selector: 'app-pagination-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, PaginationBasicExample, PaginationDataExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="pagination" [readme]="readme">
      <app-pagination-basic-example />
      <app-pagination-data-example />
    </primitive-page>
  `,
})
export class PaginationPage {
  protected readonly readme = readmeContent;
}
