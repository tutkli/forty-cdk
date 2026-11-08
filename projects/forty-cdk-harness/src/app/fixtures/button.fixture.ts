import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForButton } from 'forty-cdk/button';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-button-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForButton],
  template: `
    <input data-testid="before" placeholder="before" />
    <button
      data-testid="native"
      type="button"
      forButton
      [disabled]="disabled"
      (activate)="bump('native')"
      (click)="nativeClicks.update((n) => n + 1)"
    >
      <span data-testid="native-label">Native</span>
    </button>
    <div data-testid="custom" forButton [disabled]="disabled" (activate)="bump('custom')">
      <span data-testid="custom-label">Custom</span>
    </div>
    <input data-testid="after" placeholder="after" />
    <output data-testid="native-count">{{ nativeCount() }}</output>
    <output data-testid="custom-count">{{ customCount() }}</output>
    <output data-testid="native-click-count">{{ nativeClicks() }}</output>
  `,
})
export class ButtonFixture {
  protected readonly disabled = queryFlag('disabled');
  protected readonly nativeCount = signal(0);
  protected readonly customCount = signal(0);
  protected readonly nativeClicks = signal(0);
  protected bump(which: 'native' | 'custom'): void {
    if (which === 'native') this.nativeCount.update((n) => n + 1);
    else this.customCount.update((n) => n + 1);
  }
}
