/**
 * Allowed-character class for an OTP / PIN input. Drives both the per-character
 * filter (rejected characters are dropped and fire `(reject)`) and the
 * derived `inputmode`. Override entirely with a custom `allowedPattern` RegExp.
 */
export type OtpInputType = 'numeric' | 'alphanumeric' | 'alphabetic';

/**
 * Matches a value made up only of digits. Bind to `[allowedPattern]` for a
 * digit-only code; equivalent to the default `type="numeric"`.
 */
export const OTP_REGEXP_ONLY_DIGITS = /^[0-9]+$/;

/** Matches a value made up only of latin letters (`type="alphabetic"`). */
export const OTP_REGEXP_ONLY_CHARS = /^[a-zA-Z]+$/;

/** Matches a value made up only of digits and latin letters (`type="alphanumeric"`). */
export const OTP_REGEXP_ONLY_DIGITS_AND_CHARS = /^[a-zA-Z0-9]+$/;

const SINGLE_CHAR_BY_TYPE: Record<OtpInputType, RegExp> = {
  numeric: /[0-9]/,
  alphanumeric: /[a-zA-Z0-9]/,
  alphabetic: /[a-zA-Z]/,
};

/**
 * The single-character matcher for a built-in `type`. Each returned RegExp is
 * non-global, so repeated `.test()` calls are stateless.
 */
export function allowedCharForType(type: OtpInputType): RegExp {
  return SINGLE_CHAR_BY_TYPE[type];
}

/**
 * The `inputmode` a built-in `type` maps to: `numeric` keeps the digits-only
 * keypad, the letter classes fall back to the full text keyboard.
 */
export function inputModeForType(type: OtpInputType): 'numeric' | 'text' {
  return type === 'numeric' ? 'numeric' : 'text';
}
