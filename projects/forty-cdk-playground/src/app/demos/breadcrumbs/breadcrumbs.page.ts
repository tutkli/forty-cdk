import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { BreadcrumbsBasicExample } from './examples/basic.example';
import { BreadcrumbsCollapsedExample } from './examples/collapsed.example';
import { EXAMPLE_SOURCES } from '../../doc/example-source';
import { SOURCES } from './sources.generated';
import readmeContent from '../../../../../forty-cdk/breadcrumbs/README.md';

@Component({
  selector: 'app-breadcrumbs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, BreadcrumbsBasicExample, BreadcrumbsCollapsedExample],
  providers: [{ provide: EXAMPLE_SOURCES, useValue: SOURCES }],
  template: `
    <primitive-page slug="breadcrumbs" [readme]="readme">
      <app-breadcrumbs-basic-example />
      <app-breadcrumbs-collapsed-example />
    </primitive-page>
  `,
})
export class BreadcrumbsPage {
  protected readonly readme = readmeContent;
}
