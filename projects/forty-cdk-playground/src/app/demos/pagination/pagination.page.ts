import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { PaginationBasicExample } from './examples/basic.example';
import { PaginationDataExample } from './examples/data.example';
import readmeContent from '../../../../../forty-cdk/pagination/README.md';

@Component({
  selector: 'app-pagination-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, PaginationBasicExample, PaginationDataExample],
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
