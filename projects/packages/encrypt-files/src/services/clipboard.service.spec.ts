import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildConcealedCopyScript, copyConcealed } from './clipboard.service';

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

describe('clipboard.service', () => {
  describe('buildConcealedCopyScript', () => {
    it('should replace the clipboard with the text, marked concealed and transient so history managers skip it', () => {
      const fake = createFakePasteboard();

      runInNewContext(buildConcealedCopyScript('p"w\\ \n✨'), fake.context);

      expect(fake.events).toEqual([
        'clear',
        `${STRING_TYPE}="p\\"w\\\\ \\n✨"`,
        'org.nspasteboard.ConcealedType=""',
        'org.nspasteboard.TransientType=""',
      ]);
    });
  });

  describe('copyConcealed', () => {
    beforeEach(() => {
      runAppleScript.mockReset();
      runAppleScript.mockResolvedValue('');
    });

    it('should send the script over stdin as JXA, keeping the password off the command line', async () => {
      await copyConcealed('Hk3qzP-r7Tmwd-9xLbaS');

      expect(runAppleScript).toHaveBeenCalledWith(buildConcealedCopyScript('Hk3qzP-r7Tmwd-9xLbaS'), {
        language: 'JavaScript',
      });
    });
  });
});
