import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { DemoLayout } from '../../ui/demo-layout';
import { PrimitivePage } from '../../ui/primitive-page';
import { PaginationDataExample } from './examples/data.example';
import { PaginationDefaultExample } from './examples/default.example';
import { SOURCES } from './sources.generated';
import { DOC } from '../../../generated/docs/primitives/pagination.generated';

@Component({
  selector: 'app-pagination-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, DemoLayout, PaginationDefaultExample, PaginationDataExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="pagination" [doc]="doc">
      <demo-layout hero sourcePath="pagination/examples/default.example.ts">
        <app-pagination-default-example />
      </demo-layout>

      <demo-layout heading="driving-a-data-list" sourcePath="pagination/examples/data.example.ts">
        <app-pagination-data-example />
      </demo-layout>
    </primitive-page>
  `,
})
export class PaginationPage {
  protected readonly doc = DOC;
}
