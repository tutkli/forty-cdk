export function isHistoryChord(event: KeyboardEvent): boolean {
  return event.altKey || event.metaKey;
}

export function isShortcutChord(event: KeyboardEvent): boolean {
  if (event.metaKey) {
    return true;
  }
  if (event.getModifierState?.('AltGraph')) {
    return false;
  }
  if (event.ctrlKey) {
    return true;
  }
  return event.altKey && event.key.length === 1 && event.key.charCodeAt(0) < 0x80;
}
