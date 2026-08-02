/**
 * Fixture for `forty-cdk/no-doubled-live-region-channel`.
 *
 * A live `role` and the `aria-live` / `aria-atomic` pair are two spellings of
 * the same live-region semantics: `role="status"` implies
 * `aria-live="polite"` + `aria-atomic="true"`, `role="alert"` implies
 * `assertive` + `true`. A host declaring both says it twice and leaves a
 * reader with no way to tell which channel the primitive means — the debt
 * tutkli/forty-cdk#1598 item 2 removed from `LiveAnnouncer` and #1626 removed
 * from `[forComboboxStatus]` / `[forComboboxEmpty]`. The rule reads the role
 * from a static `role: '<name>'` in the same `host` block and reports a static
 * `aria-live` / `aria-atomic` whose value is the one that role already
 * implies. A bound role or a bound attribute is a *switch* rather than a
 * declaration (the `[forToast]` shape), a differing static value is a
 * deliberate override, and an untranscribed role is skipped rather than
 * guessed at. See `.claude/rules/conventions.md` > "ARIA emission".
 */

declare function Directive(metadata: unknown): ClassDecorator;
declare function computedRole(): string;
declare function ariaLive(): string;

// Expected: 2× forty-cdk/no-doubled-live-region-channel
// The #1626 shape: the role carries both values, so each attribute beside it
// is a restatement.
@Directive({
  selector: '[forFixtureDoubledStatus]',
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  },
})
export class ForFixtureDoubledStatus {}

// Expected: 1× forty-cdk/no-doubled-live-region-channel
// Same fault on the assertive half of the table.
@Directive({
  selector: '[forFixtureDoubledAlert]',
  host: {
    role: 'alert',
    'aria-live': 'assertive',
  },
})
export class ForFixtureDoubledAlert {}

// Allowed: the surviving shape — the role alone, chosen because this host is
// inserted into the accessibility tree with its message already present.
@Directive({
  selector: '[forFixtureRoleOnly]',
  host: {
    role: 'status',
    '[hidden]': '!shouldShow()',
  },
})
export class ForFixtureRoleOnly {
  declare readonly shouldShow: () => boolean;
}

// Allowed: the other surviving shape — the attribute pair with no role, for a
// region that exists, empty, before its text changes (`LiveAnnouncer`).
@Directive({
  selector: '[forFixtureAttributePair]',
  host: {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  },
})
export class ForFixtureAttributePair {}

// Allowed (skipped): the `[forToast]` switch. A bound role cannot be resolved
// statically, and the bound `aria-live` goes to `off` for every variant whose
// announcement routes through `LiveAnnouncer` — so the pair is a switch, not a
// duplicate.
@Directive({
  selector: '[forFixtureLiveSwitch]',
  host: {
    '[attr.role]': 'computedRole()',
    '[attr.aria-live]': 'ariaLive()',
    'aria-atomic': 'true',
  },
})
export class ForFixtureLiveSwitch {
  readonly computedRole = computedRole;
  readonly ariaLive = ariaLive;
}

// Allowed: a static role with a *bound* attribute is a switch too — the
// binding can silence the region, which the role alone cannot express.
@Directive({
  selector: '[forFixtureSilenceableStatus]',
  host: {
    role: 'status',
    '[attr.aria-live]': 'announcing() ? "polite" : "off"',
  },
})
export class ForFixtureSilenceableStatus {
  declare readonly announcing: () => boolean;
}

// Allowed: `role="log"` implies `aria-atomic="false"`, so `"true"` overrides
// the role rather than restating it.
@Directive({
  selector: '[forFixtureOverriddenLog]',
  host: {
    role: 'log',
    'aria-atomic': 'true',
  },
})
export class ForFixtureOverriddenLog {}

// Allowed (skipped): the table's fallback. `region` is not a live role and has
// no transcribed row, so a primitive making its own region live cannot fail
// the build before that row is added.
@Directive({
  selector: '[forFixtureUntranscribedRole]',
  host: {
    role: 'region',
    'aria-live': 'polite',
  },
})
export class ForFixtureUntranscribedRole {}
