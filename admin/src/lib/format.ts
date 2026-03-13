/** Auto-capitalise the first letter of a description for consistent display.
 * Only touches the first character — leaves the rest exactly as typed.
 * NOTE: Keep in sync with src/lib/format.ts (mobile app) */
export function formatDescription(description: string): string {
  if (!description || description.length === 0) return description;
  return description.charAt(0).toUpperCase() + description.slice(1);
}
