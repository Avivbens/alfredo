/**
 * `'` and `!` are written as octal: interactive bash expands history before it parses `$'...'`,
 * and its history lexer reads `\'` as the end of the quote, so a `!#` after it would run as code.
 */
export const quote = (arg: string) => {
  if (arg === '') return `$''`;
  if (/^[\w./:=@-]+$/.test(arg)) return arg;

  const safe = arg
    .replace(/\\/g, `\\\\`)
    .replace(/'/g, `\\047`)
    .replace(/!/g, `\\041`)
    .replace(/"/g, `\\"`)
    .replace(/\f/g, `\\f`)
    .replace(/\n/g, `\\n`)
    .replace(/\r/g, `\\r`)
    .replace(/\t/g, `\\t`)
    .replace(/\v/g, `\\v`)
    .replace(/\0/g, `\\0`);

  return `$'${safe}'`;
};
