/**
 * Fixture for `forty-cdk/no-doubled-disabled-reflection`.
 *
 * A host that reflects its disabled state through the native `disabled`
 * attribute must not also emit `aria-disabled` for that same state: HTML-AAM
 * already maps the content attribute to the unavailable state, so the ARIA copy
 * is read by nothing and leaves consumers two selectors for one condition. The
 * rule fires only when the `'[attr.aria-disabled]'` expression references the
 * very signal the same class passes to `reflectDisabled(…)`, which is what
 * exempts the two legitimate doublers by construction rather than by name — an
 * `aria-disabled` encoding a *different* condition stays legal. See
 * tutkli/forty-cdk#1550 / #1455 / #561 (D2) and `.claude/rules/conventions.md`
 * > "the two channels are mutually exclusive".
 */

declare function Directive(metadata: unknown): ClassDecorator;
declare function reflectDisabled(disabled: () => boolean): void;

// Expected: 1× forty-cdk/no-doubled-disabled-reflection
// The #1550 shape: the native attribute and the ARIA attribute both restate
// `effectiveDisabled`, so the ARIA one is redundant noise.
@Directive({
  selector: '[forFixtureDoubledInput]',
  host: {
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
  },
})
export class ForFixtureDoubledInput {
  declare readonly effectiveDisabled: () => boolean;

  constructor() {
    reflectDisabled(this.effectiveDisabled);
  }
}

// Expected: 1× forty-cdk/no-doubled-disabled-reflection
// The same doubling read off a shared context rather than an own member — the
// argument is normalized to its access path, so `this.ctx.effectiveDisabled`
// matches the `ctx.effectiveDisabled()` the host binding reads.
@Directive({
  selector: '[forFixtureDoubledContextInput]',
  host: {
    '[attr.aria-disabled]': 'ctx.effectiveDisabled() ? "true" : null',
  },
})
export class ForFixtureDoubledContextInput {
  declare readonly ctx: { effectiveDisabled: () => boolean };

  constructor() {
    reflectDisabled(this.ctx.effectiveDisabled);
  }
}

// Allowed: the `[forAccordionTrigger]` shape. The native attribute carries
// `item.disabled`, while `aria-disabled` reads a different signal entirely —
// the APG state of an expanded panel the accordion refuses to collapse, which
// is `false` exactly when the item is genuinely disabled.
@Directive({
  selector: '[forFixtureDistinctCondition]',
  host: {
    '[attr.aria-disabled]': 'ariaDisabled() ? "true" : null',
    '[attr.data-disabled]': 'item.disabled() ? "" : null',
  },
})
export class ForFixtureDistinctCondition {
  declare readonly ariaDisabled: () => boolean;
  declare readonly item: { disabled: () => boolean };

  constructor() {
    reflectDisabled(this.item.disabled);
  }
}

// Allowed: the `[forFieldset]` shape. The ARIA branch is gated on a non-native
// host, so the element taking `aria-disabled` is by definition never the one
// taking the native attribute (which reflects `nativeDisabled`).
@Directive({
  selector: '[forFixtureGatedOnHost]',
  host: {
    '[attr.aria-disabled]': '!isNativeFieldset() && disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class ForFixtureGatedOnHost {
  declare readonly isNativeFieldset: () => boolean;
  declare readonly disabled: () => boolean;
  declare readonly nativeDisabled: () => boolean;

  constructor() {
    reflectDisabled(this.nativeDisabled);
  }
}

// Allowed: a custom-role control reflects `aria-disabled` alone and never the
// native attribute, so it stays focusable for assistive tech per the APG.
// There is no `reflectDisabled` call to double.
@Directive({
  selector: '[forFixtureAriaOnly]',
  host: {
    role: 'checkbox',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
  },
})
export class ForFixtureAriaOnly {
  declare readonly effectiveDisabled: () => boolean;
}
