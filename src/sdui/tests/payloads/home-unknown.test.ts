import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { parsePayload } from '../../core/schema';
import { registry } from '../../components';
import { SDUIScreen } from '../../screens/SDUIScreen/SDUIScreen';
import { clearDevLog, getDevLog } from '../../utils/devLog';
import type { Payload } from '../../core/types';

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../../payloads/home-unknown.json'), 'utf-8')
);

describe('payloads/home-unknown.json — SCHEMA.md §9 degradation paths', () => {
  test('parses against the envelope schema despite the unregistered node types', () => {
    const result = parsePayload(raw);
    expect(result.success).toBe(true);
  });

  test('renders the whole page without crashing: the fallback content shows, the no-fallback node degrades to a placeholder, surrounding sections are unaffected', async () => {
    clearDevLog();
    const payload = raw as Payload;
    await render(React.createElement(SDUIScreen, { payload }));

    // video_banner is unregistered — its inline zstack fallback (the original Spotify
    // promo subtree) renders in its place.
    expect(screen.getByText('Cars24 x Spotify')).toBeTruthy();
    expect(screen.getByText('Unlimited music on every test drive')).toBeTruthy();

    // ar_showroom_banner is unregistered and has no fallback — CrashFree's own copy
    // never renders, but the page doesn't blank or throw.
    expect(screen.queryByText('CrashFree India')).toBeNull();

    // Sections before and after both broken nodes still render.
    expect(screen.getByText('Buy a car')).toBeTruthy();
    expect(screen.getByText('Cars24')).toBeTruthy();

    const log = getDevLog();
    expect(log.some((e) => e.message.includes('unknown component type "video_banner"'))).toBe(true);
    expect(log.some((e) => e.message.includes('unknown component type "ar_showroom_banner"'))).toBe(
      true
    );
  });

  test('every other node still resolves and validates — only the two deliberately-broken nodes are affected', () => {
    const payload = raw as Payload;

    function collectTypes(nodes: Payload['sections']): string[] {
      const types: string[] = [];
      function walk(node: (typeof nodes)[number]) {
        types.push(node.type);
        node.children?.forEach(walk);
        if (node.fallback) walk(node.fallback);
      }
      nodes.forEach(walk);
      return types;
    }

    const types = collectTypes(payload.sections);
    expect(types).toContain('video_banner');
    expect(types).toContain('ar_showroom_banner');

    const unknownButExpected = new Set(['video_banner', 'ar_showroom_banner']);
    const trulyUnresolved = types.filter(
      (t) => !unknownButExpected.has(t) && !registry.has(t)
    );
    expect(trulyUnresolved).toEqual([]);
  });
});
