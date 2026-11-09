import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ForToastManager } from 'forty-cdk/toast';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { afterEachOverlayCleanup } from '../../../../forty-cdk/src/test-utils/overlay-cleanup';
import { ToastActionExample } from '../demos/toast/examples/action.example';
import { ToastDefaultExample } from '../demos/toast/examples/default.example';
import { ToastSwipeExample } from '../demos/toast/examples/swipe-to-dismiss.example';

const EXAMPLES: readonly (readonly [string, Type<unknown>, string])[] = [
  ['default.example.ts', ToastDefaultExample, 'toast-variants'],
  ['action.example.ts', ToastActionExample, 'toast-action'],
  ['swipe-to-dismiss.example.ts', ToastSwipeExample, 'toast-swipe'],
];

describe('a toast example dismisses only the toasts it opened when it is destroyed', () => {
  afterEachOverlayCleanup();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it.each(EXAMPLES)('%s', async (_file, example, region) => {
    const fixture = TestBed.createComponent(example);
    await flush(fixture);
    const manager = TestBed.inject(ForToastManager);

    for (const button of (fixture.nativeElement as HTMLElement).querySelectorAll('button')) {
      button.click();
    }
    await flush(fixture);
    const unrelated = manager.show({ title: 'Item deleted', duration: 0 });
    const opened = manager.toasts().filter((toast) => toast.config.region === region);
    expect(opened.length).toBeGreaterThan(0);

    fixture.destroy();

    expect(manager.toasts().map((toast) => toast.id)).toEqual([unrelated.config().id]);
    unrelated.dismiss();
  });
});
