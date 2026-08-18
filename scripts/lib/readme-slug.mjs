export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

export class Slugger {
  #seen = new Map();

  reset() {
    this.#seen.clear();
  }

  unique(base) {
    const count = this.#seen.get(base) ?? 0;
    this.#seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  }
}

export function isFenceLine(line) {
  return /^\s*(```|~~~)/.test(line);
}

export function isTableDelimiter(line) {
  return line !== undefined && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');
}
