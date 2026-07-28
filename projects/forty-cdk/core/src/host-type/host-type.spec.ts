import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { hostButtonType } from './host-type';

@Directive({
  selector: '[probe]',
  host: {
    '[attr.type]': 'buttonType()',
  },
})
class ProbeDir {
  protected readonly buttonType = hostButtonType();
}

@Component({
  selector: 'host-cmp',
  imports: [ProbeDir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button data-testid="button" probe></button>
    <button data-testid="submit" probe type="submit"></button>
    <button data-testid="reset" probe type="reset"></button>
    <div data-testid="div" probe></div>
    <div data-testid="div-submit" probe type="submit"></div>
    <a data-testid="anchor" probe href="#"></a>
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

describe('hostButtonType', () => {
  let fixture: ComponentFixture<HostCmp>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
  });

  it('emits type="button" on a native button host', () => {
    expect(probe(fixture, 'button').getAttribute('type')).toBe('button');
  });

  it('overrides a consumer-set static type="submit" (submit protection is not an override)', () => {
    expect(probe(fixture, 'submit').getAttribute('type')).toBe('button');
  });

  it('overrides any other consumer-set static type', () => {
    expect(probe(fixture, 'reset').getAttribute('type')).toBe('button');
  });

  it('emits no type attribute on a non-button host', () => {
    expect(probe(fixture, 'div').getAttribute('type')).toBeNull();
  });

  it('removes an invalid consumer-set type from a non-button host', () => {
    expect(probe(fixture, 'div-submit').getAttribute('type')).toBeNull();
  });

  it('emits no type attribute on an anchor host', () => {
    expect(probe(fixture, 'anchor').getAttribute('type')).toBeNull();
  });
});
