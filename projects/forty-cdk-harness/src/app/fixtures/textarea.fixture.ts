import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTextarea } from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-textarea-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTextarea],
  template: `
    <textarea
      data-testid="ta"
      forTextarea
      autosize
      [(value)]="value"
      [style.box-sizing]="contentBox ? 'content-box' : 'border-box'"
      style="
        display: block;
        width: 300px;
        padding: 8px;
        border: 2px solid;
        font-size: 14px;
        line-height: 20px;
        resize: none;
        overflow: hidden;
      "
    ></textarea>
    <button data-testid="set-long" type="button" (click)="setLong()">long</button>
    <button data-testid="set-short" type="button" (click)="value.set('one line')">short</button>
    <button data-testid="clear" type="button" (click)="value.set('')">clear</button>
  `,
})
export class TextareaFixture {
  protected readonly value = signal('one line');
  protected readonly contentBox = queryFlag('contentBox');

  protected setLong(): void {
    this.value.set(Array.from({ length: 6 }, (_, i) => `programmatic line ${i + 1}`).join('\n'));
  }
}
