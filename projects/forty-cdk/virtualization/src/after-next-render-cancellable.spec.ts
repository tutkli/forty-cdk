import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, nextMacrotask } from '../../src/test-utils';
import { afterNextRenderCancellable } from './after-next-render-cancellable';

const sideEffects: string[] = [];

/**
 * Models a deferred side effect registered via `afterNextRenderCancellable`,
 * paired with a destroy hook that tears it down. On a destroy-before-render the
 * callback must not leave the side effect dangling — either it is cancelled, or
 * the destroy hook that runs alongside it undoes it.
 */
@Component({
  selector: 'probe-bubble',
  template: '<ng-content />',
})
class ProbeBubble {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRenderCancellable(() => {
      sideEffects.push('activate');
      if (el.parentNode !== document.body) {
        document.body.appendChild(el);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      el.remove();
    });
  }
}

@Component({
  imports: [ProbeBubble],
  template: `
    <div id="parent">
      <probe-bubble>probe</probe-bubble>
    </div>
  `,
})
class ProbeHost {}

describe('afterNextRenderCancellable', () => {
  beforeEach(() => {
    sideEffects.length = 0;
  });

  afterEach(() => {
    document.querySelectorAll('probe-bubble').forEach((n) => n.remove());
  });

  it('runs the callback after the first render', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeHost);
    await flush(fixture);

    expect(sideEffects).toEqual(['activate']);
    expect(document.querySelector('probe-bubble')?.parentElement).toBe(document.body);
    fixture.destroy();
  });

  it('leaves no dangling side effect when destroyed before the queued render fires', async () => {
    // Destroy synchronously, before the macrotask hop that lets the queued
    // `afterNextRender` callback run: whether it is cancelled or runs alongside
    // the destroy hook that undoes it, the side effect must not survive teardown.
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ProbeHost);
    fixture.detectChanges();

    fixture.destroy();

    await nextMacrotask();

    expect(document.querySelectorAll('probe-bubble')).toHaveLength(0);
  });
});
