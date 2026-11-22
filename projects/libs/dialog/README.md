# dialog

A native macOS dialog for Alfred workflows: a title, a message, buttons, and an optional text answer that can be masked.

```ts
import { showDialog } from '@alfredo/dialog';

const { button, text } = await showDialog({
  title: 'Encrypt Files',
  message: 'Password for 2 items → Archive.zip',
  buttons: ['Cancel', 'Encrypt'],
  defaultButton: 'Encrypt',
  answer: 'hidden',
});
```

Cancel comes back as the `Cancel` button. The script runs over stdin, so a typed answer never reaches a command line.
