## Summary

- Part of [#1152](https://github.com/tutkli/forty-cdk/issues/1152)
- [pointer-session.ts](projects/forty-cdk/core/src/drag-session/pointer-session.ts): `move()` / `up()` / `cancel()` now ignore events whose `pointerId` differs from the initiating pointer, so a second finger on a multi-touch device can no longer move, commit, or cancel the first finger's drag. `cancel()` takes the `PointerEvent` to filter on; the `Escape` path routes through a new `abort()` that keeps working without a pointer event.
- [resize-geometry.ts](projects/forty-cdk/core/src/resize-geometry/resize-geometry.ts): `startPointerResize` captures the initiating `pointerId` and discards non-matching `pointermove` / `pointerup` / `pointercancel`, so a second pointer cannot drive or end an in-progress resize.
- [swipe-dismiss.ts](projects/forty-cdk/core/src/swipe-dismiss/swipe-dismiss.ts): a pre-arm mouse move seen with no button held (`buttons === 0`) resets the stale tracking instead of arming a phantom swipe — covering a press released outside the element, which never fires `pointerup` on it.
- [drag-preview.ts](projects/forty-cdk/core/src/drag-session/drag-preview.ts): the settle/FLIP fallback timeout is scaled from the element's computed `transition-duration` (parsed to ms, `s`/`ms` aware, first segment) plus a small safety margin, instead of a hard-coded 500 ms, so a consumer transition longer than 500 ms is no longer cut short. The immediate-destroy path for a zero/absent transition is preserved.

## Test plan

- [x] lint / typecheck / unit / build

🤖 Generated with [Claude Code](https://claude.com/claude-code)
