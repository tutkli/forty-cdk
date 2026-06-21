import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { BreadcrumbsBasicExample } from './examples/basic.example';
import { BreadcrumbsCollapsedExample } from './examples/collapsed.example';

@Component({
  selector: 'app-breadcrumbs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, BreadcrumbsBasicExample, BreadcrumbsCollapsedExample],
  template: `
    <primitive-page slug="breadcrumbs">
      <app-breadcrumbs-basic-example />
      <app-breadcrumbs-collapsed-example />
    </primitive-page>
  `,
})
export class BreadcrumbsPage {}
