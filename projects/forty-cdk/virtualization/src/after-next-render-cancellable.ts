import { afterNextRender, DestroyRef, inject } from '@angular/core';

export function afterNextRenderCancellable(fn: () => void): void {
  const destroyRef = inject(DestroyRef);

  let destroyed = false;

  const ref = afterNextRender(() => {
    if (destroyed) return;
    fn();
  });

  destroyRef.onDestroy(() => {
    destroyed = true;
    ref.destroy();
  });
}
