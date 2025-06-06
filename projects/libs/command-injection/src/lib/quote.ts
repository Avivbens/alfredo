export const quote = (arg: string) => {
  if (arg === '') return `$''`;
  if (/^[\w./:=@-]+$/.test(arg)) return arg;

  const safe = arg
    .replace(/\\/g, `\\\\`)
    .replace(/'/g, `\\'`)
    .replace(/"/g, `\\"`)
    .replace(/\f/g, `\\f`)
    .replace(/\n/g, `\\n`)
    .replace(/\r/g, `\\r`)
    .replace(/\t/g, `\\t`)
    .replace(/\v/g, `\\v`)
    .replace(/\0/g, `\\0`);

  return `$'${safe}'`;
};
