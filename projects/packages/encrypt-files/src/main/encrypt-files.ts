import { FastAlfred } from 'fast-alfred';
import { basename, dirname } from 'node:path';
import { toFailureMessage } from '../common/failure-message.util';
import { toItemsLabel } from '../common/items-label.util';
import { notify } from '../common/notify.util';
import { findFreePath, toArchiveName } from '../common/output-path.util';
import { collectEntries } from '../services/collect-entries.service';
import { promptPassword } from '../services/password-prompt.service';
import { revealInFinder } from '../services/reveal.service';
import { writeEncryptedZip } from '../services/zip-writer.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    /** Alfred may hand several selected files over as one tab-separated argument */
    const paths = alfredClient.inputs.flatMap((input) => input.split('\t')).filter(Boolean);
    const [first] = paths;
    if (!first) {
      notify('Select the files to encrypt first');
      return;
    }

    const sources = await collectEntries(paths);
    if (!sources.length) {
      notify('Nothing to encrypt - the selection held no plain files or folders');
      return;
    }

    const archiveName = toArchiveName(paths);
    const destination = await findFreePath(dirname(first), archiveName);
    const choice = await promptPassword(paths.length, basename(destination));
    if (choice.kind === 'cancelled') {
      return;
    }

    await writeEncryptedZip(sources, destination, choice.password);
    await revealInFinder(destination);
    notify(`Encrypted ${toItemsLabel(paths.length)} → ${basename(destination)}`);
  } catch (error) {
    notify(toFailureMessage(error));
  }
})();
