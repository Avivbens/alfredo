import { describe, expect, it } from 'vitest';
import { toTextItem } from './text-item.service';

describe('text-item.service', () => {
  describe('toTextItem', () => {
    it('should copy the row on one line and show it in Large Type on two', () => {
      expect(toTextItem('Now 18°', 'Humidity 89%')).toEqual({
        title: 'Now 18°',
        subtitle: 'Humidity 89%',
        valid: false,
        text: { copy: 'Now 18° · Humidity 89%', largetype: 'Now 18°\nHumidity 89%' },
      });
    });

    it('should take a longer Large Type text', () => {
      expect(toTextItem('Today', 'Rain 5%', 'every field').text?.largetype).toBe('every field');
    });
  });
});
