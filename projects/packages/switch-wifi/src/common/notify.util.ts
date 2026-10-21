/** stdout feeds the workflow's Post Notification - an action finishes after Alfred has closed, so this is the only feedback. */
export function notify(text: string): void {
  console.log(text);
}
