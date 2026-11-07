const MARKER_PREFIX = /^›\s*/;

/** fast-alfred makes a clashing label unique with a ` (2)` suffix the route state never sees, so the label is read back from the input */
export function toRouteLabel(input: string, filter: string): string {
  const query = filter ? input.slice(0, input.lastIndexOf(filter)) : input;
  return query.trim().replace(MARKER_PREFIX, '');
}
