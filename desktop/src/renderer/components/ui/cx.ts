/** Tiny className combiner (no dependency). Filters falsy, joins with space. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
