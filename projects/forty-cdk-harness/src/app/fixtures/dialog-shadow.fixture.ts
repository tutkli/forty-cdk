import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDialog, type ForDialogCloseReason, ForDialogTrigger } from 'forty-cdk/dialog';
import { queryFlag } from './_query-flag';

const SHADOW_WIDGET_TAG = 'shadow-widget';

class ShadowWidget extends HTMLElement {
  connectedCallback(): void {
    if (this.shadowRoot) {
      return;
    }
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <button type="button" data-testid="shadow-a">Shadow A</button>
      <button type="button" data-testid="shadow-b">Shadow B</button>
    `;
  }
}

if (!customElements.get(SHADOW_WIDGET_TAG)) {
  customElements.define(SHADOW_WIDGET_TAG, ShadowWidget);
}

@Component({
  selector: 'app-dialog-shadow-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDialog, ForDialogTrigger],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <button data-testid="trigger" forDialogTrigger [(open)]="open">Open dialog</button>
    <button data-testid="after">After trigger</button>

    @if (open()) {
      <div forDialog data-testid="dialog" ariaLabel="Shadow dialog" (dismiss)="onClose($event)">
        @if (shadowFirst) {
          <shadow-widget data-testid="widget"></shadow-widget>
          <button data-testid="outer">Outer</button>
        } @else {
          <button data-testid="outer">Outer</button>
          <shadow-widget data-testid="widget"></shadow-widget>
        }
      </div>
    }

    <output data-testid="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
  `,
})
export class DialogShadowFixture {
  protected readonly open = signal(false);
  protected readonly lastCloseReason = signal<ForDialogCloseReason | null>(null);

  protected readonly shadowFirst = queryFlag('shadowFirst');

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastCloseReason.set(reason);
    this.open.set(false);
  }
}
