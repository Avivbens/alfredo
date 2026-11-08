import { describe, expect, it } from 'vitest';
import { copyPayloadSchema } from './copy-payload.schema';
import { gifIdSchema } from './gif-id.schema';
import { previewDownloadSchema } from './preview.schema';

const URL = 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif';

describe('gif-id.schema', () => {
  describe('gifIdSchema', () => {
    it('should accept a GIPHY id', () => {
      expect(gifIdSchema.parse('xT9IgG50Fb7Mi0prBC')).toBe('xT9IgG50Fb7Mi0prBC');
    });

    it('should reject an id that could climb out of the cache folder', () => {
      expect(() => gifIdSchema.parse('../../x')).toThrow();
      expect(() => gifIdSchema.parse('a/b')).toThrow();
      expect(() => gifIdSchema.parse('')).toThrow();
    });
  });

  describe('payloads that name cache files', () => {
    it('should reject an unsafe id in the copy payload, since it names the GIF file to download', () => {
      expect(() => copyPayloadSchema.parse({ id: '../../x', url: URL })).toThrow();
    });

    it('should reject an unsafe id in a preview download, since it names the preview file', () => {
      expect(() => previewDownloadSchema.parse({ id: '../../x', url: URL })).toThrow();
    });
  });
});
