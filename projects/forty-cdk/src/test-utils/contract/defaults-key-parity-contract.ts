/**
 * Shared contract for **defaults-key parity**: primitives of the same family
 * expose the same keys on their `For<Primitive>Defaults` interface.
 *
 * `core/defaults/per-primitive-defaults.spec.ts` proves each provider resolves
 * its fallback and merges per key, and derives the set of providers from source
 * so a fortieth cannot go uncovered. What no gate stated is that the *keys*
 * mean the same thing across a family, so a family could drift one key at a
 * time with every gate green — a tunable added to one member and not its
 * siblings, or added under a second spelling. The library already carries an
 * instance of the second shape: the three hover-scheduled overlays name the
 * same three delays, and one of them spells its open delay `delayDuration`
 * where the other two spell it `openDelay`.
 *
 * Unlike its siblings this is not a mount-based contract — there is nothing to
 * render. It is a source-derived comparison over the interface each
 * `<primitive>-defaults.ts` declares, which is the *exposed* surface: the keys
 * `provideFor<Primitive>Defaults` accepts, including the ones with no fallback
 * value (Dialog's `animateEnter` and its Drawer twin are absent from both
 * fallbacks, so a runtime `Object.keys` over them would not see the pair at
 * all).
 *
 * **The family grouping is the one declaration the guard cannot derive**, so it
 * is stated once per family in `src/lib/defaults-key-parity-adopters.spec.ts`
 * and its members are checked against source. Everything else is derived:
 *
 *   - **Every member declares every key of its family.** A key on the family's
 *     list that one member is missing fails naming both.
 *   - **A key two members of one family share must be declared by some family
 *     in the model.** That is the closure half, and it is what keeps a family's
 *     list from silently falling behind its members: two siblings growing the
 *     same tunable is the family's vocabulary widening, and the third member is
 *     the one about to drift. A key exactly one member declares is left alone
 *     on purpose — no scan can tell a legitimate per-primitive tunable
 *     (Tooltip's `showOnOverflow`, which HoverCard has no overflow trigger to
 *     need) from drift, and demanding a written reason for each would grow a
 *     ledger of every key in the library, which is the shape
 *     `.claude/rules/testing.md` warns against.
 *   - **A member that stopped declaring a defaults interface fails**, so a
 *     family cannot name a retired primitive.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */

export interface DefaultsKeyFamily {
  /** Family name, appended to the `describe` title. */
  name: string;
  /**
   * The keys every member exposes. This is the declaration — the vocabulary the
   * family shares — and the only thing here a source scan cannot infer.
   */
  keys: readonly string[];
  /**
   * The `<primitive>-defaults.ts` files in the family, relative to
   * `projects/forty-cdk/`.
   */
  members: readonly string[];
}

export interface DefaultsKeyParityContractSetup {
  /**
   * Defaults file → the keys its `For<Primitive>Defaults` interface declares,
   * for every defaults file the library ships. A member missing from this map
   * has stopped declaring an interface (or has been retired) and fails the
   * first case rather than being skipped.
   */
  declaredKeys: ReadonlyMap<string, readonly string[]>;
  /**
   * Every key declared by any family in the model, which is what the closure
   * case checks a shared key against. Supplied by the caller because the
   * closure question is about the model as a whole rather than about one
   * family: a key shared by two anchored roots is legitimately declared by the
   * hover-scheduled family instead.
   */
  modelKeys: ReadonlySet<string>;
}

const sorted = (values: Iterable<string>): string[] => [...values].sort();

/**
 * Run the defaults-key parity assertions for one family, inside a
 * `describe('defaults-key parity (<name>)', …)` block.
 */
export function assertDefaultsKeyParity(
  family: DefaultsKeyFamily,
  setup: DefaultsKeyParityContractSetup,
): void {
  describe(`defaults-key parity (${family.name})`, () => {
    it('names at least two members, each still declaring a defaults interface', () => {
      expect(family.members.length).toBeGreaterThanOrEqual(2);
      expect(family.keys.length).toBeGreaterThanOrEqual(1);

      const missing = family.members.filter(
        (member) => (setup.declaredKeys.get(member) ?? []).length === 0,
      );

      expect(sorted(missing)).toEqual([]);
    });

    it('declares every family key on every member', () => {
      const missing = family.members.flatMap((member) => {
        const keys = new Set(setup.declaredKeys.get(member) ?? []);
        return family.keys
          .filter((key) => !keys.has(key))
          .map((key) => `${member}: missing \`${key}\``);
      });

      expect(sorted(missing)).toEqual([]);
    });

    it('leaves no key two of its members share outside the declared families', () => {
      const owners = new Map<string, string[]>();
      for (const member of family.members) {
        for (const key of setup.declaredKeys.get(member) ?? []) {
          owners.set(key, [...(owners.get(key) ?? []), member]);
        }
      }

      const undeclared = [...owners.entries()]
        .filter(([key, members]) => members.length > 1 && !setup.modelKeys.has(key))
        .map(([key, members]) => `\`${key}\` shared by ${sorted(members).join(', ')}`);

      expect(sorted(undeclared)).toEqual([]);
    });
  });
}
