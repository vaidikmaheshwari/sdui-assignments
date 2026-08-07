import { Image } from 'expo-image';
import { collectPreloadUrls, prefetchPreloadUrls } from '../../../perf/preloadImages';
import type { Payload, SDUINode } from '../../core/types';

const img = (id: string, url: string, preload: boolean): SDUINode => ({
  id,
  type: 'image',
  props: { url, preload },
});

const payload = (header: SDUINode | undefined, sections: SDUINode[]): Payload =>
  ({ schemaVersion: '1.1.1', pageId: 'test', header, sections }) as unknown as Payload;

describe('collectPreloadUrls', () => {
  it('returns only the images the payload marked preload', () => {
    const p = payload(img('h', 'https://cdn/header.png', true), [
      {
        id: 's1',
        type: 'stack',
        children: [img('a', 'https://cdn/a.png', true), img('b', 'https://cdn/b.png', false)],
      },
    ]);

    expect(collectPreloadUrls(p)).toEqual(['https://cdn/header.png', 'https://cdn/a.png']);
  });

  it('dedupes a url used in more than one place', () => {
    const p = payload(undefined, [
      { id: 's1', type: 'stack', children: [img('a', 'https://cdn/same.png', true)] },
      { id: 's2', type: 'stack', children: [img('b', 'https://cdn/same.png', true)] },
    ]);

    expect(collectPreloadUrls(p)).toEqual(['https://cdn/same.png']);
  });

  it('skips an unresolved binding rather than requesting it literally', () => {
    const p = payload(undefined, [img('a', '{{data.car.image}}', true)]);

    expect(collectPreloadUrls(p)).toEqual([]);
  });

  it('walks a fallback subtree, which renders when its sibling fails', () => {
    const p = payload(undefined, [
      { id: 's1', type: 'unknown_type', fallback: img('fb', 'https://cdn/fallback.png', true) },
    ]);

    expect(collectPreloadUrls(p)).toEqual(['https://cdn/fallback.png']);
  });
});

describe('prefetchPreloadUrls (item 5 v1 — retained only to keep the regression reproducible)', () => {
  beforeEach(() => {
    (Image.prefetch as jest.Mock).mockClear();
  });

  it('issues a second request for urls that mounted <Image>s are already fetching', () => {
    // This is the documented defect, asserted rather than described: v1 hands the same urls to
    // Image.prefetch that the tree is about to request through <Image>. PERF.md P7 item 5 has
    // what that costs. v2 (opt5b) calls this function not at all.
    prefetchPreloadUrls(['https://cdn/a.png', 'https://cdn/b.png']);

    expect(Image.prefetch).toHaveBeenCalledWith(['https://cdn/a.png', 'https://cdn/b.png'], {
      cachePolicy: 'memory-disk',
    });
  });

  it('issues nothing when there is nothing marked preload', () => {
    prefetchPreloadUrls([]);

    expect(Image.prefetch).not.toHaveBeenCalled();
  });
});
