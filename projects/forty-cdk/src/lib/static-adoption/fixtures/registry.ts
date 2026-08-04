import { COLLECTION_FAMILY_ADOPTERS } from './collection';
import { DATETIME_FAMILY_ADOPTERS } from './datetime';
import { DISCLOSURE_FAMILY_ADOPTERS } from './disclosure';
import { DISPLAY_FAMILY_ADOPTERS } from './display';
import { FORM_FAMILY_ADOPTERS } from './form';
import { MENU_FAMILY_ADOPTERS } from './menu';
import type { StaticAdoptionAdopter } from './mount';
import { OVERLAY_FAMILY_ADOPTERS } from './overlay';

/**
 * Every adopter group the static-attribute adoption contract runs over. The
 * sweep in `static-adoption.spec.ts` iterates it in order, and
 * `adopters.spec.ts` folds the claims back onto the library source that emits
 * them.
 *
 * A new piece calling one of the six core seams owes an entry here (or a claim
 * on an existing entry), and the adoption guard fails on a call site no claim
 * declares. Grouped by family, one file per family, exactly as the SSR smoke
 * suite's fixtures are.
 */
export const STATIC_ADOPTION_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  ...DISCLOSURE_FAMILY_ADOPTERS,
  ...COLLECTION_FAMILY_ADOPTERS,
  ...MENU_FAMILY_ADOPTERS,
  ...OVERLAY_FAMILY_ADOPTERS,
  ...DATETIME_FAMILY_ADOPTERS,
  ...FORM_FAMILY_ADOPTERS,
  ...DISPLAY_FAMILY_ADOPTERS,
];
