import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { AspectRatioExample } from './examples/aspect-ratio.example';
import readmeContent from '../../../../../forty-cdk/aspect-ratio/README.md';

@Component({
  selector: 'app-aspect-ratio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, AspectRatioExample],
  template: `
    <primitive-page slug="aspect-ratio" [readme]="readme">
      <app-aspect-ratio-example />
    </primitive-page>
  `,
})
export class AspectRatioPage {
  protected readonly readme = readmeContent;
}
