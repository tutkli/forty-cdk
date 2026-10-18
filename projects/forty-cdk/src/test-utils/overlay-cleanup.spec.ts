import { Component } from '@angular/core';
import { injectPortal } from 'forty-cdk/core';

import { afterEachOverlayCleanup } from './overlay-cleanup';
import { renderHost } from './render';

@Component({
  selector: 'portaled-probe',
  host: { role: 'dialog' },
  template: '',
})
class PortaledProbe {
  constructor() {
    injectPortal();
  }
}

@Component({
  imports: [PortaledProbe],
  host: { 'data-fixture': 'overlay-cleanup-probe' },
  template: '<portaled-probe />',
})
class PortaledProbeHost {}

describe('afterEachOverlayCleanup', () => {
  afterEachOverlayCleanup();

  it('accepts a portaled node its destroy hook removes during the TestBed teardown', async () => {
    const { flush } = renderHost(PortaledProbeHost);
    await flush();

    expect(document.body.querySelector(':scope > portaled-probe')).not.toBeNull();
  });

  it.fails('fails a passing test that leaves a portaled node in document.body', () => {
    const leaked = document.createElement('div');
    leaked.setAttribute('role', 'dialog');
    document.body.appendChild(leaked);
  });

  it.fails('fails a passing test that leaves the scroll lock on <body>', () => {
    document.body.style.overflow = 'hidden';
  });
});
