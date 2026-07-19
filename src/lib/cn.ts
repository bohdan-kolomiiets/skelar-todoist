/**
 * Join class names, dropping falsy values.
 * Dependency-free helper so components can compose Tailwind classes cleanly.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
