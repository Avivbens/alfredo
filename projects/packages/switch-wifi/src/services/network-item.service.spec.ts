import { describe, expect, it } from 'vitest';
import { NetworkActionSchema } from '../models/network-action.schema';
import { toNetworkItem } from './network-item.service';

describe('network-item.service', () => {
  describe('toNetworkItem', () => {
    it('should join the network on ↩ with a payload the select script accepts', () => {
      const { arg } = toNetworkItem('LayerX Security');

      expect(NetworkActionSchema.parse(JSON.parse(String(arg)))).toEqual({ kind: 'join', ssid: 'LayerX Security' });
    });

    it('should key the row by SSID so Alfred learns which networks get picked most', () => {
      expect(toNetworkItem('Aviv')).toMatchObject({ uid: 'Aviv', title: 'Aviv' });
    });
  });
});
