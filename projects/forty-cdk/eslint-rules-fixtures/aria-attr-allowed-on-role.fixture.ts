/**
 * Fixture for `forty-cdk/aria-attr-allowed-on-role`.
 *
 * Emitting an `aria-*` property on a role that does not support it is an
 * `aria-allowed-attr` violation: the attribute lands in the DOM, automated
 * a11y tooling flags it, and the state it was meant to convey simply is not
 * conveyed. The rule cross-checks every `'[attr.aria-*]'` host binding against
 * the ARIA 1.2 supported-property list for the host's role — taken from a
 * static `role: '<name>'` in the same `host` block, or from the element the
 * selector pins for the two elements whose role is statically decidable
 * (`<button>`, `<textarea>`). Global properties are supported everywhere and
 * are never reported; an unresolvable or untranscribed role is skipped rather
 * than guessed at. See tutkli/forty-cdk#1476 / #1472 / #1393 item 13 and
 * `.claude/rules/conventions.md` > "ARIA emission".
 */

declare function Directive(metadata: unknown): ClassDecorator;
declare function computedRole(): string;

// Expected: 1× forty-cdk/aria-attr-allowed-on-role
// The #1472 shape: `role="group"` supports only `aria-activedescendant` on top
// of the global properties, so the container has no ARIA channel for its
// read-only state — the `data-readonly` hook carries it and the announcement
// belongs to the piece whose role supports it.
@Directive({
  selector: '[forFixtureUnsupportedGroup]',
  host: {
    role: 'group',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
  },
})
export class ForFixtureUnsupportedGroup {
  declare readonly readonly: () => boolean;
}

// Allowed: `role="spinbutton"` does support `aria-readonly`, so the same
// emission on a segment is the correct placement.
@Directive({
  selector: '[forFixtureSupportedSpinbutton]',
  host: {
    role: 'spinbutton',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
  },
})
export class ForFixtureSupportedSpinbutton {
  declare readonly readonly: () => boolean;
}

// Expected: 1× forty-cdk/aria-attr-allowed-on-role
// `aria-checked` belongs to the checkbox / radio / switch family; a
// `role="button"` toggle conveys its state through `aria-pressed`.
@Directive({
  selector: '[forFixtureCheckedButton]',
  host: {
    role: 'button',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
  },
})
export class ForFixtureCheckedButton {
  declare readonly checked: () => boolean;
}

// Allowed: `aria-pressed` is the supported toggle-button property, and
// `aria-label` / `aria-disabled` are global — supported on every role.
@Directive({
  selector: '[forFixturePressedButton]',
  host: {
    role: 'button',
    '[attr.aria-pressed]': 'checked() ? "true" : "false"',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
  },
})
export class ForFixturePressedButton {
  declare readonly checked: () => boolean;
  declare readonly ariaLabel: () => string | null;
  declare readonly disabled: () => boolean;
}

// Expected: 1× forty-cdk/aria-attr-allowed-on-role
// No `role` in the host block, but `button[…]` pins a native `<button>` whose
// role is `button` regardless of its attributes — the implicit-role case that
// would otherwise let the `[forToggle]` family through unchecked.
@Directive({
  selector: 'button[forFixtureImplicitButton]',
  host: {
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
  },
})
export class ForFixtureImplicitButton {
  declare readonly checked: () => boolean;
}

// Allowed: same implicit `button` role, supported property.
@Directive({
  selector: 'button[forFixtureImplicitPressed]',
  host: {
    '[attr.aria-pressed]': 'checked() ? "true" : "false"',
  },
})
export class ForFixtureImplicitPressed {
  declare readonly checked: () => boolean;
}

// Allowed (skipped): `input[…]` does not pin a role — an `<input>` is a
// `textbox`, `checkbox`, `radio`, `button`, … depending on its `type`, which
// the selector does not constrain. The rule resolves no role and stays quiet.
@Directive({
  selector: 'input[forFixtureImplicitInput]',
  host: {
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
  },
})
export class ForFixtureImplicitInput {
  declare readonly checked: () => boolean;
}

// Allowed (skipped): a dynamic `'[attr.role]'` cannot be resolved statically,
// so the host is skipped even though `aria-checked` would be unsupported on
// some of the roles the expression can produce.
@Directive({
  selector: '[forFixtureDynamicRole]',
  host: {
    '[attr.role]': 'computedRole()',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
  },
})
export class ForFixtureDynamicRole {
  declare readonly checked: () => boolean;
  readonly computedRole = computedRole;
}

// Allowed (skipped): the role table's fallback. A role with no transcribed row
// produces no report rather than a false positive — a primitive reaching for a
// new role can never fail the build before its row is added.
@Directive({
  selector: '[forFixtureUnknownRole]',
  host: {
    role: 'not-a-real-role',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
  },
})
export class ForFixtureUnknownRole {
  declare readonly checked: () => boolean;
}
