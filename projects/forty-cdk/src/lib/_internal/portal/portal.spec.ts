import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../test-utils';
import { injectPortal } from './portal';

@Component({
  selector: 'portaled-bubble',
  template: '<ng-content />',
})
class PortaledBubble {
  constructor() {
    injectPortal();
  }
}

@Component({
  imports: [PortaledBubble],
  template: `
    <div id="parent">
      <portaled-bubble>portaled</portaled-bubble>
    </div>
  `,
})
class PortalHost {}

@Component({
  selector: 'targeted-bubble',
  template: '<ng-content />',
})
class TargetedBubble {
  constructor() {
    injectPortal({ target: document.getElementById('custom-target')! });
  }
}

@Component({
  imports: [TargetedBubble],
  template: `
    <div id="parent">
      <targeted-bubble>targeted</targeted-bubble>
    </div>
  `,
})
class CustomTargetHost {}

describe('injectPortal', () => {
  afterEach(() => {
    document
      .querySelectorAll('portaled-bubble, targeted-bubble, #custom-target')
      .forEach((n) => n.remove());
  });

  it('moves the host element to document.body after first render', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);

    const parent = fixture.nativeElement.querySelector('#parent');
    const portaled = document.querySelector('portaled-bubble')!;

    expect(portaled.parentElement).toBe(document.body);
    expect(parent.contains(portaled)).toBe(false);
  });

  it('removes the portaled element on destroy', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);

    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(1);
    fixture.destroy();
    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(0);
  });

  it('honors a custom target container', async () => {
    const target = document.createElement('div');
    target.id = 'custom-target';
    document.body.appendChild(target);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(CustomTargetHost);
    await flush(fixture);

    const portaled = document.querySelector('targeted-bubble')!;
    expect(portaled.parentElement).toBe(target);
  });

  it('is idempotent: re-rendering does not move the element again', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);
    await flush(fixture);

    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(1);
  });
});
