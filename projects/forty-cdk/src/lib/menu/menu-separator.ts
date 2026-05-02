import { Directive } from '@angular/core';

/**
 * Visual + semantic separator between menu items. Decorative — never
 * focused, never registers with the menu's item collection.
 */
@Directive({
  selector: '[forMenuSeparator]',
  host: {
    role: 'separator',
    'aria-orientation': 'horizontal',
  },
})
export class ForMenuSeparator {}
