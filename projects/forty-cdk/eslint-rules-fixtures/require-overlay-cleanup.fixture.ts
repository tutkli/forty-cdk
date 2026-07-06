/**
 * Fixture for `forty-cdk/require-overlay-cleanup`.
 *
 * A spec that imports a primitive which portals content to `document.body`
 * must call `afterEachOverlayCleanup()` (from
 * `projects/forty-cdk/src/test-utils/overlay-cleanup.ts`) at least once in the
 * file, so a test throwing mid-render can't orphan the portaled node and leak
 * stale ARIA into the next spec. See CLAUDE.md > Testing notes > Test isolation
 * — non-negotiables > rule 5 and tutkli/forty-cdk#1155 / #1256.
 *
 * This file imports a portaling content directive but never calls
 * `afterEachOverlayCleanup()`, so the rule fires once. The compliant shape
 * (the same import PLUS one `afterEachOverlayCleanup()` call anywhere in the
 * file) can't be shown here: the rule is file-level, so adding the call would
 * clear the whole file and there would be nothing left to flag.
 */

import { ForPopoverContent } from 'forty-cdk/popover';

// Expected: 1× forty-cdk/require-overlay-cleanup — imports a portaling overlay
// content directive with no `afterEachOverlayCleanup()` call in the file.
export const usesPortalingOverlay = [ForPopoverContent];
