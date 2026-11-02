import { describe, expect, it } from 'vitest';
import { CopyPayloadSchema } from '../models/copy-payload.schema';
import type { GiphyGif } from '../models/giphy-gif.schema';
import { toGifItem } from './gif-item.service';

const ORIGINAL_URL = 'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif';
const DOWNSIZED_URL = 'https://media0.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy-downsized.gif';

const HOPE_GIF: GiphyGif = {
  id: '3o7TKSjRrfIPjeiVyM',
  title: 'Hope GIF by Hello All',
  images: { original: { url: ORIGINAL_URL }, downsized: { url: DOWNSIZED_URL } },
};

describe('gif-item.service', () => {
  describe('toGifItem', () => {
    it('should hand ↩ the rendition ⇧ plays, so a preloaded preview doubles as the copy', () => {
      const { arg } = toGifItem(HOPE_GIF);

      expect(CopyPayloadSchema.parse(JSON.parse(String(arg)))).toEqual({
        id: '3o7TKSjRrfIPjeiVyM',
        url: DOWNSIZED_URL,
      });
    });

    it('should offer no modifier actions, so ↩ is the one way to copy', () => {
      expect(toGifItem(HOPE_GIF)).not.toHaveProperty('mods');
    });

    it('should copy the original GIF URL on ⌘C', () => {
      expect(toGifItem(HOPE_GIF)).toMatchObject({ title: 'Hope GIF by Hello All', text: { copy: ORIGINAL_URL } });
    });

    it('should credit GIPHY on every result, as its API terms require', () => {
      expect(toGifItem(HOPE_GIF).subtitle).toContain('Powered By GIPHY');
    });

    it('should point at ⇧, since Quick Look is the only place a GIF plays', () => {
      expect(toGifItem(HOPE_GIF).subtitle).toContain('⇧ to watch it');
    });

    it('should preview the lighter downsized rendition in Quick Look', () => {
      expect(toGifItem(HOPE_GIF).quicklookurl).toBe(DOWNSIZED_URL);
    });

    it('should preview the original when GIPHY sent no downsized rendition', () => {
      const gif: GiphyGif = { ...HOPE_GIF, images: { original: { url: ORIGINAL_URL } } };

      expect(toGifItem(gif).quicklookurl).toBe(ORIGINAL_URL);
    });

    it('should play the local preview in Quick Look once it is downloaded, since a web link loads slowly', () => {
      expect(toGifItem(HOPE_GIF, { preview: '/cache/previews/3o7TKSjRrfIPjeiVyM.gif' }).quicklookurl).toBe(
        '/cache/previews/3o7TKSjRrfIPjeiVyM.gif',
      );
    });

    it('should name a GIF that GIPHY left untitled', () => {
      expect(toGifItem({ ...HOPE_GIF, title: '' }).title).toBe('Untitled GIF');
    });

    it('should show the thumbnail when there is one and the workflow icon otherwise', () => {
      expect(toGifItem(HOPE_GIF, { thumbnail: '/cache/thumbnails/3o7TKSjRrfIPjeiVyM.gif' }).icon).toEqual({
        path: '/cache/thumbnails/3o7TKSjRrfIPjeiVyM.gif',
      });
      expect(toGifItem(HOPE_GIF).icon).toBeUndefined();
    });

    it('should carry the GIF id as uid, so a preview rerun keeps the selected row', () => {
      expect(toGifItem(HOPE_GIF).uid).toBe('3o7TKSjRrfIPjeiVyM');
    });
  });
});
