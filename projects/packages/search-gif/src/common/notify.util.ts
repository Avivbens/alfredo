/** stdout feeds the workflow's Post Notification, which shows only when there is text - so only a failed copy notifies. */
export function notify(text: string): void {
  console.log(text);
}
