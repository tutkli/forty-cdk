import { Component, Directive, input, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { reflectDisabled } from './disabled-reflection';

@Directive({ selector: '[reflect]' })
class Reflect {
  // Named `state` rather than `disabled` so the native `disabled` attribute is
  // driven only by reflectDisabled, never by an input binding.
  readonly state = input(false);

  constructor() {
    reflectDisabled(this.state);
  }
}

@Component({
  imports: [Reflect],
  template: `<button reflect [state]="state()">x</button>`,
})
class Host {
  readonly state = signal(false);
}

@Component({
  imports: [Reflect],
  // A consumer-set static `disabled` the directive never owned.
  template: `<button reflect [state]="state()" disabled>x</button>`,
})
class HostWithStaticDisabled {
  readonly state = signal(false);
}

function setup<T>(component: { new (): T }): {
  fixture: ComponentFixture<T>;
  host: T;
  button: HTMLButtonElement;
} {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  return { fixture, host: fixture.componentInstance, button };
}

describe('reflectDisabled', () => {
  it('does not set the attribute while disabled is false', () => {
    const { button } = setup(Host);

    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('sets the native disabled attribute when disabled becomes true', () => {
    const { fixture, host, button } = setup(Host);

    host.state.set(true);
    fixture.detectChanges();

    expect(button.getAttribute('disabled')).toBe('');
  });

  it('removes an attribute it set itself when disabled goes back to false', () => {
    const { fixture, host, button } = setup(Host);

    host.state.set(true);
    fixture.detectChanges();
    expect(button.hasAttribute('disabled')).toBe(true);

    host.state.set(false);
    fixture.detectChanges();

    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('preserves a consumer-set static attribute while disabled stays false', () => {
    const { button } = setup(HostWithStaticDisabled);

    expect(button.getAttribute('disabled')).toBe('');
  });

  it('never removes a consumer-set static attribute across an enable cycle', () => {
    const { fixture, host, button } = setup(HostWithStaticDisabled);

    host.state.set(true);
    fixture.detectChanges();
    expect(button.hasAttribute('disabled')).toBe(true);

    host.state.set(false);
    fixture.detectChanges();

    // The directive never owned the attribute (it was present before the
    // truthy edge), so the false edge must leave it untouched.
    expect(button.getAttribute('disabled')).toBe('');
  });

  it('preserves an attribute applied imperatively while disabled is false', () => {
    const { fixture, host, button } = setup(Host);

    // Consumer drives the attribute outside the directive's inputs.
    button.setAttribute('disabled', '');

    // Cycle the disabled state to force the reflection effect to re-run.
    host.state.set(true);
    fixture.detectChanges();
    host.state.set(false);
    fixture.detectChanges();

    expect(button.getAttribute('disabled')).toBe('');
  });

  it('works under zoneless change detection', () => {
    const { fixture, host, button } = setup(Host);

    host.state.set(true);
    fixture.detectChanges();
    expect(button.hasAttribute('disabled')).toBe(true);

    host.state.set(false);
    fixture.detectChanges();
    expect(button.hasAttribute('disabled')).toBe(false);
  });
});
