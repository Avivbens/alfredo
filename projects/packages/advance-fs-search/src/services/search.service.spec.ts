import { describe, expect, it } from 'vitest';
import { toMdfindArgs } from './search.service';

describe('search.service', () => {
  describe('toMdfindArgs', () => {
    it('should match the name anywhere in the file name and add the type query', () => {
      expect(toMdfindArgs('alfredo', 'kMDItemContentType == "public.folder"', [])).toEqual([
        `kMDItemFSName == '*alfredo*' && kMDItemContentType == "public.folder"`,
      ]);
    });

    it('should leave the type query out when every type is searched', () => {
      expect(toMdfindArgs('alfredo', '', [])).toEqual([`kMDItemFSName == '*alfredo*'`]);
    });

    it('should pass each location as its own -onlyin pair', () => {
      expect(toMdfindArgs('alfredo', '', ['/Users/me/dev', '/Users/me/My Projects'])).toEqual([
        '-onlyin',
        '/Users/me/dev',
        '-onlyin',
        '/Users/me/My Projects',
        `kMDItemFSName == '*alfredo*'`,
      ]);
    });

    it('should keep a name with spaces as typed, which the old shell quoting broke', () => {
      expect(toMdfindArgs('Filter Images', '', [])).toEqual([`kMDItemFSName == '*Filter Images*'`]);
    });

    it('should escape quotes and backslashes, so a name cannot end its Spotlight value early', () => {
      expect(toMdfindArgs(`Aviv's \\ notes`, '', [])).toEqual([`kMDItemFSName == '*Aviv\\'s \\\\ notes*'`]);
    });

    it('should keep shell syntax as plain text, since mdfind runs without a shell', () => {
      expect(toMdfindArgs('a$(touch x)`id`b', '', [])).toEqual([`kMDItemFSName == '*a$(touch x)\`id\`b*'`]);
    });
  });
});
