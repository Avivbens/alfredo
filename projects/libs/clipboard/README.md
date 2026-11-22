# clipboard

Copy text to the macOS clipboard from an Alfred workflow, optionally kept out of clipboard history.

```ts
import { copyToClipboard } from '@alfredo/clipboard';

await copyToClipboard(password, { sensitive: true });
```

`sensitive` marks the copy concealed and transient, so Alfred's clipboard history and other managers skip it. The text goes over stdin, never on a command line.
