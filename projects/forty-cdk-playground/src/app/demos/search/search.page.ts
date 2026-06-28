import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SearchBasicExample } from './examples/basic.example';
import { SearchFieldExample } from './examples/field.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/search/README.md';

@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SearchBasicExample, SearchFieldExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="search" [readme]="readme">
      <app-search-basic-example />
      <app-search-field-example />
    </primitive-page>
  `,
})
export class SearchPage {
  protected readonly readme = readmeContent;
}
