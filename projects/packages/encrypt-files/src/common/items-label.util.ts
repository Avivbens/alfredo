export function toItemsLabel(count: number): string {
  const noun = count === 1 ? 'item' : 'items';

  return `${count} ${noun}`;
}
