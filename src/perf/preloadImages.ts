/**
 * P7 item 5 — collect the images the *payload* marked `preload` and warm them before render.
 *
 * The walk is generic: it looks for `type === 'image'` nodes whose `props.preload` is true. It
 * has no idea which sections are above the fold, and must not — that is the server's
 * declaration, expressed by which nodes carry the flag (see the `deferred` note in SCHEMA.md
 * §3 for the same argument).
 */
import { Image } from 'expo-image';
import type { Payload, SDUINode } from '../sdui/core/types';

function walk(node: SDUINode, out: string[]): void {
  if (node.type === 'image' && node.props?.preload === true) {
    const url = node.props.url;
    // Bindings are unresolved at this point, so a templated url is skipped rather than
    // prefetched as the literal string "{{data.x}}" — a wasted request that would show up as
    // an item 5 regression caused entirely by this helper.
    if (typeof url === 'string' && !url.includes('{{')) out.push(url);
  }
  node.children?.forEach((child) => walk(child, out));
  if (node.fallback) walk(node.fallback, out);
}

export function collectPreloadUrls(payload: Payload): string[] {
  const out: string[] = [];
  if (payload.header) walk(payload.header, out);
  payload.sections.forEach((section) => walk(section, out));
  return Array.from(new Set(out));
}

/**
 * Item 5 **v1 only** (`opt5`). Retained so the regression stays reproducible, not because it
 * should be used.
 *
 * The comment below used to read "the page will request the same url through the normal <Image>
 * path anyway" as though that were harmless. It is the bug: prefetching a url that a mounted
 * <Image> is already fetching does not warm a cache, it opens a second connection for the same
 * bytes and competes with the first. Measured cost (PERF.md P7 item 5): 6 of 10 cold starts
 * never finished loading the above-fold images inside an 8s window, against 10 of 10 finishing
 * in ~1.1s on the baseline.
 *
 * v2 (`opt5b`) therefore prefetches nothing at all and keeps only `priority: 'high'`, which
 * reorders the requests expo-image has already queued rather than adding to them.
 *
 * The obvious third option — prefetch *below*-fold images, which have no mounted <Image> yet —
 * has no window to run in on this screen. With item 2 enabled, deferred sections mount at
 * `InteractionManager` idle (baseline `interactive` median 1005ms), which is *earlier* than the
 * above-fold images finish loading (`aboveFoldImagesLoaded` median 1150ms). Any prefetch issued
 * before that point competes with the visible images, and any prefetch issued after it is
 * simply duplicating the request the now-mounted section has already made. It is left
 * unimplemented rather than implemented and reported as a wash.
 */
export function prefetchPreloadUrls(urls: string[]): void {
  if (urls.length === 0) return;
  void Image.prefetch(urls, { cachePolicy: 'memory-disk' }).catch(() => undefined);
}
