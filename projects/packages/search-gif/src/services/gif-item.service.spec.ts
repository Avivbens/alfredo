import { describe, expect, it } from 'vitest';
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
    it('should copy the original GIF URL on ↩ and ⌘C', () => {
      expect(toGifItem(HOPE_GIF)).toMatchObject({
        title: 'Hope GIF by Hello All',
        arg: ORIGINAL_URL,
        text: { copy: ORIGINAL_URL },
      });
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

    it('should name a GIF that GIPHY left untitled', () => {
      expect(toGifItem({ ...HOPE_GIF, title: '' }).title).toBe('Untitled GIF');
    });

    it('should show the thumbnail when there is one and the workflow icon otherwise', () => {
      expect(toGifItem(HOPE_GIF, '/cache/thumbnails/3o7TKSjRrfIPjeiVyM.gif').icon).toEqual({
        path: '/cache/thumbnails/3o7TKSjRrfIPjeiVyM.gif',
      });
      expect(toGifItem(HOPE_GIF).icon).toBeUndefined();
    });

    it('should leave out the uid, so Alfred keeps GIPHY ranking', () => {
      expect(toGifItem(HOPE_GIF)).not.toHaveProperty('uid');
    });
  });
});
