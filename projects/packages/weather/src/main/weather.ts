import { FastAlfred } from 'fast-alfred';

(async () => {
  const alfredClient = new FastAlfred();

  alfredClient.output({
    items: [{ title: 'Weather', subtitle: 'TODO: replace this starter with the workflow', valid: false }],
  });
})();
