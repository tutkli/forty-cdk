import { Component, Directive, input, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { hostStaticAttribute } from './host-static-attribute';

@Directive({
  selector: '[probe]',
  host: { '[attr.for]': 'resolvedFor()' },
})
class ProbeDir {
  readonly owned = input<string | null>(null);

  protected readonly resolvedFor = hostStaticAttribute('for', () => this.owned());
}

@Component({
  imports: [ProbeDir],
  template: `
    <label data-testid="static" probe for="email"></label>
    <label data-testid="owned" probe for="email" [owned]="owned()"></label>
    <label data-testid="bare" probe></label>
    <label data-testid="empty" probe for=""></label>
  `,
})
class HostCmp {
  readonly owned = signal<string | null>('generated');
}

function probe(fixture: ComponentFixture<HostCmp>, testid: string): HTMLElement {
  return fixture.nativeElement.querySelector(`[data-testid="${testid}"]`) as HTMLElement;
}

describe('hostStaticAttribute', () => {
  let fixture: ComponentFixture<HostCmp>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
  });

  it('re-emits the static attribute while the fallback resolves to null', () => {
    expect(probe(fixture, 'static').getAttribute('for')).toBe('email');
  });

  it('emits the fallback over the static attribute while it resolves to a value', () => {
    expect(probe(fixture, 'owned').getAttribute('for')).toBe('generated');
  });

  it('returns to the static attribute when the fallback drops to null', () => {
    fixture.componentInstance.owned.set(null);
    fixture.detectChanges();

    expect(probe(fixture, 'owned').getAttribute('for')).toBe('email');
  });

  it('emits no attribute when neither side has a value', () => {
    expect(probe(fixture, 'bare').hasAttribute('for')).toBe(false);
    expect(probe(fixture, 'empty').hasAttribute('for')).toBe(false);
  });
});
