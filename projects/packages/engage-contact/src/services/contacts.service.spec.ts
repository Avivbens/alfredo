import type { FastAlfred } from 'fast-alfred';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as zurk from 'zurk';
import { NATIVE_ADDON_PATH } from '../common/constants';
import type { IContact } from '../models/contact.model';
import { getContacts } from './contacts.service';

const { zurkTemplateLiteralFn, addon } = vi.hoisted(() => ({
  zurkTemplateLiteralFn: vi.fn(),
  addon: { getAuthStatus: vi.fn(), requestAccess: vi.fn(), getAllContacts: vi.fn() },
}));
vi.mock('zurk', () => ({ $: vi.fn(() => zurkTemplateLiteralFn) }));
vi.mock('node-mac-contacts', () => ({ default: addon }));

/** `xattr -d` on a file that was never downloaded through a browser */
const NO_QUARANTINE = {
  status: 1,
  stdout: '',
  stderr: `xattr: ${NATIVE_ADDON_PATH}: No such xattr: com.apple.quarantine\n`,
};

const CONTACT: IContact = {
  identifier: '410FE041-5C4E-48DA-B4DE-04C15EA3DBAC:ABPerson',
  firstName: 'Jane',
  lastName: 'Doe',
  nickname: '',
  birthday: '',
  phoneNumbers: ['+972 50-123-4567'],
  emailAddresses: ['jane.doe@acme.com'],
  postalAddresses: [],
};

function createAlfredClient(): FastAlfred {
  return { cache: { get: vi.fn(), setWithTTL: vi.fn() } } as unknown as FastAlfred;
}

describe('contacts.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    zurkTemplateLiteralFn.mockResolvedValue({ status: 0, stdout: '', stderr: '' });
    addon.getAuthStatus.mockReturnValue('Authorized');
    addon.getAllContacts.mockReturnValue([CONTACT]);
  });

  describe('getContacts', () => {
    it('should clear the quarantine flag before using the addon, since Gatekeeper blocks a quarantined ad-hoc signed addon', async () => {
      await getContacts(createAlfredClient());

      expect(zurk.$).toHaveBeenCalledWith({ nothrow: true });
      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('xattr -d com.apple.quarantine')]),
        NATIVE_ADDON_PATH,
      );
      expect(zurkTemplateLiteralFn.mock.invocationCallOrder[0]).toBeLessThan(
        addon.getAuthStatus.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it('should still load the contacts when there is no quarantine flag to clear', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(NO_QUARANTINE);

      const contacts = await getContacts(createAlfredClient());

      expect(contacts).toEqual([CONTACT]);
    });

    it('should request access and return no contacts while access is not granted', async () => {
      addon.getAuthStatus.mockReturnValue('Not Determined');

      const contacts = await getContacts(createAlfredClient());

      expect(addon.requestAccess).toHaveBeenCalled();
      expect(contacts).toEqual([]);
    });
  });
});
