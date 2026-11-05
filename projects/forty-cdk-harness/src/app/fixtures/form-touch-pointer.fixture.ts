import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';
import { ForSwitch } from 'forty-cdk/switch';
import { ForToggle } from 'forty-cdk/toggle';

@Component({
  selector: 'app-form-touch-pointer-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForCheckbox, ForSwitch, ForToggle],
  template: `
    <div style="padding: 20px">
      <button forCheckbox aria-label="Terms" data-testid="checkbox">C</button>
      <button forSwitch aria-label="Notify" data-testid="switch">S</button>
      <button forToggle aria-label="Bold" data-testid="toggle">T</button>
    </div>
    <p data-testid="outside" style="padding: 40px">Outside</p>
  `,
})
export class FormTouchPointerFixture {}
