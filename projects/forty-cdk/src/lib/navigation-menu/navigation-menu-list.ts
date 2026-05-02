import { Directive } from '@angular/core';

import { injectNavigationMenuContext } from './navigation-menu-context';

/**
 * Wrapper around the row / column of items. Carries `data-orientation` so
 * the consumer can flip CSS layout. No semantic role — this is a layout
 * helper, not a `menubar` (the disclosure pattern doesn't use one).
 */
@Directive({
  selector: '[forNavigationMenuList]',
  exportAs: 'forNavigationMenuList',
  host: {
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForNavigationMenuList {
  protected readonly ctx = injectNavigationMenuContext('ForNavigationMenuList');
}
