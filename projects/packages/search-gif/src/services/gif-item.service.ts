import type { AlfredListItem } from 'fast-alfred';
import { encodeCopyPayload } from '../models/copy-payload.schema';
import type { GiphyGif } from '../models/giphy-gif.schema';
import { toPreviewDownload } from './preview.service';

interface GifFiles {
  thumbnail?: string;
  preview?: string;
}

/**
 * The uid lets Alfred keep the selected row across preview reruns, while `skipknowledge` on the list keeps GIPHY's ranking.
 * ↩ copies the rendition ⇧ plays, so a preloaded preview doubles as the copy.
 */
export function toGifItem(gif: GiphyGif, { thumbnail, preview }: GifFiles = {}): AlfredListItem {
  const { id, title, images } = gif;
  const rendition = toPreviewDownload(gif);

  return {
    uid: id,
    title: title || 'Untitled GIF',
    subtitle: '↩ to copy the GIF · ⇧ to watch it · Powered By GIPHY',
    arg: encodeCopyPayload(rendition),
    quicklookurl: preview ?? rendition.url,
    text: { copy: images.original.url, largetype: title },
    icon: thumbnail ? { path: thumbnail } : undefined,
  };
}
