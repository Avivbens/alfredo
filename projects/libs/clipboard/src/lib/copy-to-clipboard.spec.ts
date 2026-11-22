import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCopyScript, copyToClipboard } from './copy-to-clipboard';

const { runAppleScript } = vi.hoisted(() => ({ runAppleScript: vi.fn() }));
vi.mock('@alfredo/run-applescript', () => ({ runAppleScript }));

const STRING_TYPE = 'public.utf8-plain-text';

/** A stand-in for JXA's ObjC bridge: records what the script does to the general pasteboard, in order */
function createFakePasteboard() {
  const events: string[] = [];
  const pasteboard = {
    get clearContents() {
      events.push('clear');
      return 1;
    },
    setStringForType: (value: string, type: string) => events.push(`${type}=${JSON.stringify(value)}`),
  };
  const $ = Object.assign((value: string) => value, {
    NSPasteboard: { generalPasteboard: pasteboard },
    NSPasteboardTypeString: STRING_TYPE,
  });

  return { events, context: { $, ObjC: { import: () => undefined } } };
}

describe('copy-to-clipboard', () => {
  describe('buildCopyScript', () => {
    it('should mark a sensitive copy concealed and transient, so clipboard history skips it', () => {
      const fake = createFakePasteboard();

      runInNewContext(buildCopyScript('Hk3qzP-r7Tmwd-9xLbaS', { sensitive: true }), fake.context);

      expect(fake.events).toEqual([
        'clear',
        `${STRING_TYPE}="Hk3qzP-r7Tmwd-9xLbaS"`,
        'org.nspasteboard.ConcealedType=""',
        'org.nspasteboard.TransientType=""',
      ]);
    });

    it('should make a plain copy by default, which clipboard history may keep', () => {
      const fake = createFakePasteboard();

      runInNewContext(buildCopyScript('hello'), fake.context);

      expect(fake.events).toEqual(['clear', `${STRING_TYPE}="hello"`]);
    });

    it('should copy quotes, backslashes, newlines and emoji unchanged', () => {
      const fake = createFakePasteboard();

      runInNewContext(buildCopyScript('p"w\\ \n✨'), fake.context);

      expect(fake.events[1]).toBe(`${STRING_TYPE}=${JSON.stringify('p"w\\ \n✨')}`);
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      runAppleScript.mockReset();
      runAppleScript.mockResolvedValue('');
    });

    it('should send the script over stdin as JXA, keeping the text off the command line', async () => {
      await copyToClipboard('Hk3qzP-r7Tmwd-9xLbaS', { sensitive: true });

      expect(runAppleScript).toHaveBeenCalledWith(buildCopyScript('Hk3qzP-r7Tmwd-9xLbaS', { sensitive: true }), {
        language: 'JavaScript',
      });
    });
  });
});
