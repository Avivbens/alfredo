import { describe, expect, it } from 'vitest';
import { previewRerunVariablesSchema } from './preview.schema';

describe('preview.schema', () => {
  describe('previewRerunVariablesSchema', () => {
    it('should read the rerun count Alfred passes back as a string', () => {
      expect(previewRerunVariablesSchema.parse({ preview_query: 'hope', preview_reruns: '3' })).toEqual({
        preview_query: 'hope',
        preview_reruns: 3,
      });
    });

    it('should start from no query and no reruns on a fresh run', () => {
      expect(previewRerunVariablesSchema.parse({})).toEqual({ preview_query: '', preview_reruns: 0 });
    });
  });
});
