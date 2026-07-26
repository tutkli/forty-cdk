import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  input,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { composeIds, hostDescribedBy, hostLabelledBy } from './host-aria';

@Directive({
  selector: '[probe]',
  host: {
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
class ProbeDir {
  readonly labelFallback = input<string | null>(null);
  readonly descriptionFallback = input<string | null>(null);

  protected readonly labelledBy = hostLabelledBy(() => this.labelFallback());
  protected readonly describedBy = hostDescribedBy(() => this.descriptionFallback());
}

@Component({
  selector: 'host-cmp',
  imports: [ProbeDir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      data-testid="static-label"
      probe
      aria-labelledby="my-heading"
      labelFallback="generated"
    ></div>
    <div data-testid="no-static-label" probe labelFallback="generated"></div>
    <div data-testid="empty-static-label" probe aria-labelledby="" labelFallback="generated"></div>
    <div
      data-testid="bound-label"
      probe
      [attr.aria-labelledby]="'bound-heading'"
      labelFallback="generated"
    ></div>
    <div
      data-testid="composed-description"
      probe
      aria-describedby="hint"
      descriptionFallback="desc error"
    ></div>
    <div
      data-testid="duplicate-description"
      probe
      aria-describedby="hint"
      descriptionFallback="hint"
    ></div>
    <div data-testid="no-static-description" probe descriptionFallback="desc"></div>
    <div data-testid="static-description" probe aria-describedby="hint"></div>
  `,
})
class HostCmp {}

function probe(fixture: ComponentFixture<HostCmp>, testid: string): HTMLElement {
  const el = fixture.nativeElement.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;
  if (!el) {
    throw new Error(`No probe matched "${testid}"`);
  }
  return el;
}

describe('host-aria', () => {
  let fixture: ComponentFixture<HostCmp>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
  });

  describe('hostLabelledBy', () => {
    it('preserves a consumer-set static aria-labelledby over the library fallback', () => {
      expect(probe(fixture, 'static-label').getAttribute('aria-labelledby')).toBe('my-heading');
    });

    it('emits the library fallback when the host carries no static value', () => {
      expect(probe(fixture, 'no-static-label').getAttribute('aria-labelledby')).toBe('generated');
    });

    it('treats an empty static value as absent', () => {
      expect(probe(fixture, 'empty-static-label').getAttribute('aria-labelledby')).toBe(
        'generated',
      );
    });

    it('does NOT adopt a consumer [attr.aria-labelledby] binding (static-only boundary)', () => {
      expect(probe(fixture, 'bound-label').getAttribute('aria-labelledby')).toBe('generated');
    });
  });

  describe('hostDescribedBy', () => {
    it('composes the consumer value first and the library ids after it', () => {
      expect(probe(fixture, 'composed-description').getAttribute('aria-describedby')).toBe(
        'hint desc error',
      );
    });

    it('never duplicates an id the consumer already references', () => {
      expect(probe(fixture, 'duplicate-description').getAttribute('aria-describedby')).toBe('hint');
    });

    it('emits the library ids alone when the host carries no static value', () => {
      expect(probe(fixture, 'no-static-description').getAttribute('aria-describedby')).toBe('desc');
    });

    it('preserves a consumer-set static value when the library has no ids', () => {
      expect(probe(fixture, 'static-description').getAttribute('aria-describedby')).toBe('hint');
    });
  });
});

describe('composeIds', () => {
  it('returns the library ids when the consumer has none', () => {
    expect(composeIds(null, 'a b')).toBe('a b');
  });

  it('returns the consumer ids when the library has none', () => {
    expect(composeIds('hint', null)).toBe('hint');
  });

  it('returns null when neither side has ids', () => {
    expect(composeIds(null, null)).toBeNull();
  });

  it('puts the consumer ids first and appends the library ids', () => {
    expect(composeIds('hint', 'desc error')).toBe('hint desc error');
  });

  it('does not duplicate an id the consumer already references', () => {
    expect(composeIds('hint desc', 'desc error')).toBe('hint desc error');
  });
});
