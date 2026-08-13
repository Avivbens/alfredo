import { describe, expect, it } from '@jest/globals';
import { escapeAppleScriptString } from './escape-applescript-string';

describe('escapeAppleScriptString', () => {
  it('should leave plain text untouched', () => {
    expect(escapeAppleScriptString('Call the bank')).toBe('Call the bank');
  });

  it('should escape double quotes', () => {
    expect(escapeAppleScriptString('Lunch at Joe"s')).toBe('Lunch at Joe\\"s');
  });

  it('should escape backslashes before quotes, so the escape itself cannot be escaped away', () => {
    expect(escapeAppleScriptString('back\\slash "quoted"')).toBe('back\\\\slash \\"quoted\\"');
  });

  it('should turn real line breaks and tabs into AppleScript escapes', () => {
    expect(escapeAppleScriptString('first\nsecond\r\tthird')).toBe('first\\nsecond\\r\\tthird');
  });
});
