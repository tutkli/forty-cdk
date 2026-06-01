import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { SliderExample } from './examples/slider.example';

@Component({
  selector: 'app-slider-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, SliderExample],
  template: `
    <primitive-page slug="slider">
      <app-slider-example />
    </primitive-page>
  `,
})
export class SliderPage {}
