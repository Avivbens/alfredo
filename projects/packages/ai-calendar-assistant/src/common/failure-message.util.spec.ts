import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toFailureMessage } from './failure-message.util';

/**
 * The error execFile threw for a real osascript run of an AppleScript `error` statement that mimics
 * the fallback's missing-calendar failure, so no app was touched.
 */
const OSASCRIPT_ERROR = Object.assign(
  new Error(
    'Command failed: osascript -e error "Calendar got an error: Can’t get calendar \\"Work\\"." number -1728\n6:59: execution error: Calendar got an error: Can’t get calendar "Work". (-1728)\n',
  ),
  {
    code: 1,
    killed: false,
    signal: null,
    stdout: '',
    stderr: '6:59: execution error: Calendar got an error: Can’t get calendar "Work". (-1728)\n',
  },
);

describe('failure-message.util', () => {
  describe('toFailureMessage', () => {
    it('should prettify a zod error instead of showing its issue JSON', () => {
      const { error } = z.object({ summary: z.string() }).safeParse({});

      expect(toFailureMessage(error)).toBe('✖ Invalid input: expected string, received undefined\n  → at summary');
    });

    it("should show only osascript's stderr, since the message repeats the whole script", () => {
      expect(toFailureMessage(OSASCRIPT_ERROR)).toBe(
        '6:59: execution error: Calendar got an error: Can’t get calendar "Work". (-1728)',
      );
    });

    it('should fall back to the message when stderr is blank', () => {
      expect(toFailureMessage(Object.assign(new Error('Command failed'), { stderr: '  \n' }))).toBe('Command failed');
    });

    it("should show an error's message", () => {
      expect(toFailureMessage(new Error('Calendar "Work" was not found or is read-only'))).toBe(
        'Calendar "Work" was not found or is read-only',
      );
    });

    it('should stringify anything that is not an error', () => {
      expect(toFailureMessage('timed out')).toBe('timed out');
    });
  });
});
