import { inject } from '@angular/core';
import { CssVarNamespacer } from '@angular/platform-browser';

export interface FloatingCustomProperties {
  readonly anchorWidth: string;
  readonly anchorHeight: string;
  readonly availableWidth: string;
  readonly availableHeight: string;
  readonly contentTransformOrigin: string;
  readonly arrowOffset: string;
}

export function injectFloatingCustomProperties(): FloatingCustomProperties {
  const namespacer = inject(CssVarNamespacer);
  return {
    anchorWidth: namespacer.namespace('--for-floating-anchor-width'),
    anchorHeight: namespacer.namespace('--for-floating-anchor-height'),
    availableWidth: namespacer.namespace('--for-floating-available-width'),
    availableHeight: namespacer.namespace('--for-floating-available-height'),
    contentTransformOrigin: namespacer.namespace('--for-floating-content-transform-origin'),
    arrowOffset: namespacer.namespace('--for-floating-arrow-offset'),
  };
}
