/** Joins CSS module class names, dropping empty/conditional ones. */
export function joinClassNames(...classNames: (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
