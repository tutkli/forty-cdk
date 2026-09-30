/**
 * Text a defaults key holds: a plain string, or a function returning the
 * current string. The library calls the function each time it reads the
 * text, from inside the reactive context that renders or announces it, so a
 * function that reads a signal (the active language, say) keeps the text
 * current as that signal changes.
 *
 * @example
 * ```ts
 * provideForComboboxDefaults(() => {
 *   const i18n = inject(AppI18n);
 *   return { clearAriaLabel: () => i18n.t('combobox.clear') };
 * });
 * ```
 */
export type LocalizableText = string | (() => string);

export function resolveText(text: LocalizableText): string {
  return typeof text === 'function' ? text() : text;
}

export function resolveTextInput(
  own: string | null | undefined,
  fallback: LocalizableText,
): string | null {
  return own === undefined ? resolveText(fallback) : own;
}

export function resolveTextRecord<K extends string>(
  scope: Partial<Record<K, LocalizableText>>,
  own: Partial<Record<K, string>>,
): Partial<Record<K, string>> {
  const result: Partial<Record<K, string>> = {};
  for (const key of Object.keys(scope) as K[]) {
    const text = scope[key];
    if (text !== undefined) {
      result[key] = resolveText(text);
    }
  }
  for (const key of Object.keys(own) as K[]) {
    const text = own[key];
    if (text !== undefined) {
      result[key] = text;
    }
  }
  return result;
}
