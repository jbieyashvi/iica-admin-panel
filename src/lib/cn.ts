// Minimal classnames joiner — no dependency needed for the prototype.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
