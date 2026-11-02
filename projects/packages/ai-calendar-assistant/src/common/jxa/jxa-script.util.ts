/**
 * osascript runs the handler from its source, so a handler must not reach outside its own body - no imported values or module constants, only types.
 * The `run` wrapper keeps working whatever name the bundler gives the function.
 */
export function toJxaScript(handler: (...argv: never) => unknown): string {
  return `function run(argv) { return (${handler.toString()})(argv); }`;
}
