import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { DemoHeadings } from '../doc/demo-headings';
import { DemoLayout } from './demo-layout';

/**
 * The preview a demo renders, which its "Preview" tab already names
 * ([#2394](https://github.com/tutkli/forty-cdk/issues/2394)): a page with
 * seven demos must not add seven region landmarks that all read "Preview".
 */
describe('the demo preview', () => {
  it('adds no landmark inside the tabpanel its tab names', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), DemoHeadings],
    });
    const fixture = TestBed.createComponent(DemoLayout);
    fixture.componentRef.setInput('sourcePath', 'fixture/examples/default.example.ts');
    fixture.componentRef.setInput('hero', true);
    await flush(fixture);

    const panel = (fixture.nativeElement as HTMLElement).querySelector('[role="tabpanel"]');
    if (panel === null) {
      throw new Error('the demo rendered no tabpanel');
    }
    const landmarks = panel.querySelectorAll(
      'section[aria-label], section[aria-labelledby], [role="region"]',
    );

    expect(panel.querySelector('.preview')).not.toBeNull();
    expect(landmarks).toHaveLength(0);
  });
});
