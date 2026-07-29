import { Component, Directive } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';

import { ForToast, provideForToast } from './toast';
import { ForToastAction } from './toast-action';
import { ForToastClose } from './toast-close';
import { ForToastDescription } from './toast-description';
import { ForToastTitle } from './toast-title';

@Directive({
  selector: '[wrapperToast]',
  exportAs: 'wrapperToast',
  providers: provideForToast(WrapperToast),
  host: { class: 'wrapper-toast' },
})
class WrapperToast extends ForToast {}

@Directive({ selector: '[wrapperToastTitle]', hostDirectives: [ForToastTitle] })
class WrapperToastTitle {}

@Directive({ selector: '[wrapperToastDescription]', hostDirectives: [ForToastDescription] })
class WrapperToastDescription {}

@Directive({
  selector: '[wrapperToastAction]',
  hostDirectives: [{ directive: ForToastAction, inputs: ['altText'] }],
})
class WrapperToastAction {}

@Directive({ selector: '[wrapperToastClose]', hostDirectives: [ForToastClose] })
class WrapperToastClose {}

@Component({
  imports: [
    WrapperToast,
    WrapperToastTitle,
    WrapperToastDescription,
    WrapperToastAction,
    WrapperToastClose,
  ],
  template: `
    <div wrapperToast data-testid="toast" (dismiss)="reason = $event">
      <span wrapperToastTitle data-testid="title">Saved</span>
      <span wrapperToastDescription data-testid="description">Your changes are live</span>
      <button wrapperToastAction altText="Undo the save" data-testid="action">Undo</button>
      <button wrapperToastClose data-testid="close">×</button>
    </div>
  `,
})
class WrapperHost {
  reason: string | null = null;
}

describe('ForToast subclass wrapper (#1524)', () => {
  afterEachOverlayCleanup();

  it('mounts a subclassed root whose own providers come from provideForToast', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[data-testid="toast"]')?.getAttribute('role')).toBe('status');
  });

  it('wires the registered title and description into the toast a11y names', () => {
    const { el } = renderHost(WrapperHost);

    const toast = el.querySelector<HTMLElement>('[data-testid="toast"]');
    const title = el.querySelector<HTMLElement>('[data-testid="title"]');
    const description = el.querySelector<HTMLElement>('[data-testid="description"]');

    expect(title?.id).toBeTruthy();
    expect(description?.id).toBeTruthy();
    expect(toast?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(toast?.getAttribute('aria-describedby')).toBe(description?.id);
  });

  it('routes the close button of the subclassed root through requestClose', async () => {
    const { el, fixture, flush } = renderHost(WrapperHost);

    el.querySelector<HTMLElement>('[data-testid="close"]')!.click();
    await flush();

    expect(fixture.componentInstance.reason).toBe('manual');
  });
});
