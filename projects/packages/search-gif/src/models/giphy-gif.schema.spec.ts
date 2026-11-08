import { describe, expect, it } from 'vitest';
import { giphyGifSchema, giphySearchResponseSchema } from './giphy-gif.schema';

/** Trimmed from a GIPHY search response. */
const GIF = {
  id: 'xT9IgG50Fb7Mi0prBC',
  title: 'Hope GIF',
  images: { original: { url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif' } },
};

describe('giphy-gif.schema', () => {
  describe('giphyGifSchema', () => {
    it('should accept a GIPHY id', () => {
      expect(giphyGifSchema.parse(GIF).id).toBe('xT9IgG50Fb7Mi0prBC');
    });

    it('should reject an id that is not a plain name, since it becomes part of a file path', () => {
      expect(() => giphyGifSchema.parse({ ...GIF, id: '../../../Library/LaunchAgents/x' })).toThrow();
      expect(() => giphyGifSchema.parse({ ...GIF, id: '' })).toThrow();
    });
  });

  describe('giphySearchResponseSchema', () => {
    it('should drop a GIF with an unsafe id and keep the rest', () => {
      const { data } = giphySearchResponseSchema.parse({ data: [{ ...GIF, id: '../x' }, GIF] });

      expect(data.map(({ id }) => id)).toEqual(['xT9IgG50Fb7Mi0prBC']);
    });
  });
});
