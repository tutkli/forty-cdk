import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  model,
  signal,
} from '@angular/core';
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

/**
 * A wrapper whose whole template — including the trigger — renders into a
 * shadow root on its own host, which is what `ViewEncapsulation.ShadowDom`
 * does. No custom element involved: this is the shape an Angular consumer
 * reaches shadow DOM through, and the one that makes a raw
 * `document.activeElement` return-focus capture resolve to an unfocusable host.
 */
@Component({
  selector: 'app-shadow-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  imports: [ForDialogTrigger],
  template: `
    <button data-testid="shadow-trigger" forDialogTrigger [(open)]="open">Open from shadow</button>
  `,
})
export class ShadowTriggerHost {
  readonly open = model(false);
}

/**
 * The surface itself is the shadow host: a `ViewEncapsulation.ShadowDom`
 * wrapper composing `[forDialog]` through `hostDirectives`, so every control
 * lives in the trap container's *own* shadow root. A candidate query that only
 * descends into descendants' shadow roots finds none of them, and Tab moves
 * nothing at all.
 */
@Component({
  selector: 'app-shadow-surface',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  hostDirectives: [{ directive: ForDialog, inputs: ['ariaLabel'], outputs: ['dismiss'] }],
  template: `
    <button data-testid="own-a">Own A</button>
    <button data-testid="own-b">Own B</button>
  `,
})
export class ShadowSurfaceHost {}

@Component({
  selector: 'app-dialog-shadow-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDialog, ForDialogTrigger, ShadowTriggerHost, ShadowSurfaceHost],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (shadowTrigger) {
      <app-shadow-trigger [(open)]="open" />
    } @else {
      <button data-testid="trigger" forDialogTrigger [(open)]="open">Open dialog</button>
    }
    <button data-testid="after">After trigger</button>

    @if (open()) {
      @if (shadowSurface) {
        <app-shadow-surface
          data-testid="dialog"
          ariaLabel="Shadow surface dialog"
          (dismiss)="onClose($event)"
        />
      } @else {
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
    }

    <output data-testid="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
  `,
})
export class DialogShadowFixture {
  protected readonly open = signal(false);
  protected readonly lastCloseReason = signal<ForDialogCloseReason | null>(null);

  protected readonly shadowFirst = queryFlag('shadowFirst');
  protected readonly shadowTrigger = queryFlag('shadowTrigger');
  protected readonly shadowSurface = queryFlag('shadowSurface');

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastCloseReason.set(reason);
    this.open.set(false);
  }
}
