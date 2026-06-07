import {
  Component,
  Directive,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type Signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../test-utils';
import { injectHasFocusableContent } from './focusable-content';

@Directive({ selector: '[probe]' })
class Probe {
  readonly has = injectHasFocusableContent();
}

@Component({
  imports: [Probe],
  template: `
    <div probe #panel>
      @if (showButton()) {
        <button type="button">Inside</button>
      }
      @if (showHiddenButton()) {
        <button type="button" hidden>Hidden</button>
      }
      @if (showInertButton()) {
        <div inert><button type="button">Inert</button></div>
      }
    </div>
  `,
})
class Host {
  readonly showButton = signal(false);
  readonly showHiddenButton = signal(false);
  readonly showInertButton = signal(false);
  readonly probe = viewChild.required(Probe);
}

function setup(platformId: unknown = 'browser'): {
  has: Signal<boolean>;
  instance: Host;
  flush: () => Promise<void>;
} {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: PLATFORM_ID, useValue: platformId },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const instance = fixture.componentInstance;
  return {
    get has() {
      return instance.probe().has;
    },
    instance,
    flush: () => flush(fixture),
  };
}

describe('injectHasFocusableContent', () => {
  it('reports false for an element with no focusable descendants', async () => {
    const { has, flush } = setup();
    await flush();
    expect(has()).toBe(false);
  });

  it('reports true once a focusable descendant is present', async () => {
    const { has, instance, flush } = setup();
    instance.showButton.set(true);
    await flush();
    expect(has()).toBe(true);
  });

  it('reacts when focusable content is added then removed after first render', async () => {
    const { has, instance, flush } = setup();
    await flush();
    expect(has()).toBe(false);

    instance.showButton.set(true);
    await flush();
    expect(has()).toBe(true);

    instance.showButton.set(false);
    await flush();
    expect(has()).toBe(false);
  });

  it('ignores [hidden] candidates', async () => {
    const { has, instance, flush } = setup();
    instance.showHiddenButton.set(true);
    await flush();
    expect(has()).toBe(false);
  });

  it('ignores candidates under an [inert] ancestor', async () => {
    const { has, instance, flush } = setup();
    instance.showInertButton.set(true);
    await flush();
    expect(has()).toBe(false);
  });

  it('stays false on a non-browser platform (SSR-safe)', async () => {
    const { has, instance, flush } = setup('server');
    instance.showButton.set(true);
    await flush();
    expect(has()).toBe(false);
  });
});
