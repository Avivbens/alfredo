import { AlfredListItem, FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { Variables } from '../common/variables.enum';
import { getTablePlusConnections } from '../services/get-connections.service';
import { searchConnection } from '../services/search-connection.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('table-plus-db'));

  const sliceAmount: number = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number });

  const fuzzyThreshold: number = alfredClient.env.getEnv(Variables.FUZZY_THRESHOLD, {
    defaultValue: 0.4,
    parser: (input) => Number(input) / 10,
  });

  try {
    const connections = await getTablePlusConnections();

    const filteredConnections = await searchConnection(connections, alfredClient.input, sliceAmount, fuzzyThreshold);

    const items: AlfredListItem[] = filteredConnections.map(({ ID, DatabaseName, Enviroment, ConnectionName }) => {
      const subtitle = `[${Enviroment}] ${DatabaseName}`;
      const arg = `tableplus://?id=${ID}`;

      return {
        title: ConnectionName,
        uid: ID,
        subtitle,
        arg,
      };
    });

    const sliced = items.slice(0, sliceAmount);
    alfredClient.output({ items: sliced });
  } catch (error) {
    alfredClient.error(error);
  }
})();
