export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampInt(input: string | number, fallback: number): number {
  const n = Number.parseInt(String(input), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeHex(input: string | null | undefined, fallback = "#000000"): string {
  if (!input) return fallback;

  let s = String(input).trim();
  if (!s) return fallback;

  if (!s.startsWith("#")) s = `#${s}`;
  s = s.toUpperCase();

  // #RGB -> #RRGGBB
  const short = /^#([0-9A-F]{3})$/;
  const long = /^#([0-9A-F]{6})$/;

  const m3 = s.match(short);
  if (m3) {
    const [r, g, b] = m3[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (long.test(s)) return s;

  return fallback;
}


