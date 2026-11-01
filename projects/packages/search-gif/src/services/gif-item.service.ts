import type { AlfredListItem } from 'fast-alfred';
import type { GiphyGif } from '../models/giphy-gif.schema';

/** No uid, so Alfred keeps GIPHY's ranking instead of floating earlier picks to the top. */
export function toGifItem({ title, images }: GiphyGif, iconPath?: string): AlfredListItem {
  const url = images.original.url;

  return {
    title: title || 'Untitled GIF',
    subtitle: '↩ to copy the URL · ⇧ to watch it · Powered By GIPHY',
    arg: url,
    quicklookurl: images.downsized?.url ?? url,
    text: { copy: url, largetype: title },
    icon: iconPath ? { path: iconPath } : undefined,
  };
}
