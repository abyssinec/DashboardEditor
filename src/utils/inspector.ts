export function clampInt(v: any, fallback: number) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function normalizeHex(v: string) {
  let s = (v || "").trim();
  if (!s) return "#000000";
  if (!s.startsWith("#")) s = "#" + s;
  s = "#" + s.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 4) {
    const r = s[1],
      g = s[2],
      b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (s.length >= 7) return s.slice(0, 7).toUpperCase();
  return (s + "000000").slice(0, 7).toUpperCase();
}


