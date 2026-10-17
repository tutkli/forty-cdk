/**
 * Fixture for the config-level `no-restricted-syntax` bans in `eslint.config.js`.
 *
 * The fixtures override switches `no-restricted-syntax` off for this
 * directory, so this fixture is
 * Linted as `projects/forty-cdk/core/src/no-restricted-syntax.ts`
 * under the real config instead. Every configured selector fires at least once
 * here, so dropping or breaking one shows up as a short count.
 */

import {
  Directive,
  HostBinding,
  HostListener,
  Input,
  // Expected: 1× no-restricted-syntax — the `NgModule` import.
  NgModule,
  // Expected: 1× no-restricted-syntax — the `NgZone` import.
  NgZone,
  // Allowed: every other `@angular/core` import.
  Output,
  inject,
  type InjectionToken,
} from '@angular/core';

declare const TOKEN: InjectionToken<string>;

export const zone = NgZone;

@Directive({
  selector: '[forZzzDecorators]',
  host: {
    // Expected: 1× no-restricted-syntax — `"false"` on a truthy-only attribute.
    '[attr.aria-disabled]': 'disabled ? "true" : "false"',
    // Expected: 1× no-restricted-syntax — a static `type: "button"` host attribute.
    type: 'button',
  },
})
export class ForZzzDecorators {
  // Expected: 2× no-restricted-syntax — `@Input()` and `@Output()`.
  @Input() disabled = false;
  @Output() changed = undefined;

  // Expected: 2× no-restricted-syntax — `@HostBinding()` and `@HostListener()`.
  @HostBinding('class.active') active = false;
  @HostListener('click') onClick(): void {}
}

// Expected: 1× no-restricted-syntax — the `NgModule` decorator.
@NgModule({})
export class ZzzModule {}

// Expected: 1× no-restricted-syntax — a `Service` class suffix.
export class ZzzService {}

export function probeInjectionContext(): string | null {
  // Expected: 1× no-restricted-syntax — `try` / `catch` around a lone `inject(…)`.
  try {
    return inject(TOKEN);
  } catch {
    return null;
  }
}

// Allowed: the host binding returns `null` for its falsy branch.
@Directive({
  selector: '[forZzzAllowed]',
  host: {
    '[attr.aria-disabled]': 'disabled ? "true" : null',
    '[attr.type]': 'buttonType()',
  },
})
export class ForZzzAllowed {
  declare readonly disabled: boolean;
  declare readonly buttonType: () => string | null;
}
