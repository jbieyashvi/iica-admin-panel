// ID + initials helpers.

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'XX';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// IICA ID format: INITIALS.3-DIGIT-NUMBER.IICA  e.g. RP.673.IICA
export function makeIicaId(name: string, seed?: number): string {
  const num = seed != null ? seed % 1000 : Math.floor(Math.random() * 1000);
  return `${initialsOf(name)}.${String(num).padStart(3, '0')}.IICA`;
}

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}
