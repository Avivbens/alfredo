/**
 * Escape a value before interpolating it into an AppleScript string literal.
 *
 * A raw `"` closes the literal early and a raw newline breaks the source line,
 * so any externally-sourced text (LLM output, user config, clipboard) must pass
 * through here or it can turn a script into a syntax error.
 */
export function escapeAppleScriptString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}
