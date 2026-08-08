import React, { type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { LayoutChangeEvent } from 'react-native';
import { ScrollView, View } from 'react-native';

import { text } from '../sdui/components/atoms/text';
import { image } from '../sdui/components/atoms/image';
import { icon } from '../sdui/components/atoms/icon';
import { badge } from '../sdui/components/atoms/badge';
import { button } from '../sdui/components/atoms/button';
import { input } from '../sdui/components/atoms/input';
import { chip_group } from '../sdui/components/atoms/chip_group';
import { stack } from '../sdui/components/layout/stack';
import { zstack } from '../sdui/components/layout/zstack';
import { divider } from '../sdui/components/layout/divider';
import { rail } from '../sdui/components/layout/rail';
import { grid } from '../sdui/components/layout/grid';
import { resolveStyle } from '../sdui/core/theme';
import type { Action, NodeStyle, SDUINode as SDUINodeShape, ThemeTokens } from '../sdui/core/types';

/**
 * Static twin of payloads/home.json (docs/PROMPTS.md P6): the same atom/layout Component
 * functions the SDUI renderer uses, called directly with hardcoded props. No JSON import, no
 * ComponentRegistry.resolve, no `{{binding}}` resolution, no Zod — the theme tokens and every
 * node's content below are TypeScript literals duplicated by value from home.json, not read
 * from it. Deliberately NOT simplified: every section, tile and card from the SDUI screen is
 * reproduced 1:1, including Pressable wrappers on nodes that had an `onTap` in the JSON (the
 * exact route/params are irrelevant since nothing here dispatches — only the fact that a
 * Pressable wraps the node is measurable and is preserved for parity).
 */

// Same values as payloads/home.json's theme.tokens — duplicated, not imported, so this file
// has no dependency on any JSON asset.
const THEME: ThemeTokens = {
  color: {
    brand: '#3B24C4',
    brandSurface: '#4A32E0',
    bg: '#FFFFFF',
    surfaceRaised: '#F5F6F8',
    tileBlue: '#123FA8',
    tileGreen: '#1F6A4A',
    tileCream: '#FBF3E4',
    textPrimary: '#101828',
    textOnBrand: '#FFFFFF',
    textMuted: '#667085',
    accent: '#3B24C4',
    danger: '#E03131',
    success: '#12B76A',
    border: '#EAECF0',
    scrim: 'rgba(16,24,40,0.55)',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { sm: 6, md: 12, lg: 16, pill: 999 },
  type: {
    h1: { size: 24, weight: '600' },
    h2: { size: 20, weight: '600' },
    body: { size: 14, weight: '400' },
    caption: { size: 12, weight: '400' },
    ghost: { size: 72, weight: '700' },
  },
};

const noop = () => {};
// Every onTap-bearing node below shares this inert action — dispatch is a no-op, so the exact
// route/params never matter, only that the node is wrapped in a Pressable (as it is in the
// SDUI render), which is what the perf comparison actually needs to be fair about.
const TAP: Action = { type: 'navigate', payload: { route: 'static' } };

function sty(s?: NodeStyle) {
  return resolveStyle(s, THEME);
}

// ---- Thin wrappers over the real Component functions, matching home.json's node shape ----

function T(p: {
  id: string;
  value: string;
  variant?: string;
  color?: string;
  maxLines?: number;
  align?: 'left' | 'center' | 'right';
  opacity?: number;
  style?: NodeStyle;
  onTap?: boolean;
}) {
  const Component = text.Component;
  return (
    <Component
      id={p.id}
      props={{
        value: p.value,
        variant: p.variant ?? 'type.body',
        color: p.color ?? 'color.textPrimary',
        maxLines: p.maxLines,
        align: p.align ?? 'left',
        opacity: p.opacity ?? 1,
      }}
      style={sty(p.style)}
      theme={THEME}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    />
  );
}

function Img(p: {
  id: string;
  url: string;
  aspectRatio?: number;
  radius?: string;
  contentMode?: 'cover' | 'contain' | 'fill';
  style?: NodeStyle;
  onTap?: boolean;
}) {
  const Component = image.Component;
  return (
    <Component
      id={p.id}
      props={{
        url: p.url,
        aspectRatio: p.aspectRatio,
        radius: p.radius,
        contentMode: p.contentMode ?? 'cover',
        preload: false,
      }}
      style={sty(p.style)}
      theme={THEME}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    />
  );
}

function Ic(p: { id: string; name: string; size?: number; color?: string; onTap?: boolean }) {
  const Component = icon.Component;
  return (
    <Component
      id={p.id}
      props={{ name: p.name, size: p.size ?? 24, color: p.color ?? 'color.textPrimary' }}
      theme={THEME}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    />
  );
}

function Bdg(p: {
  id: string;
  label: string;
  tone?: 'neutral' | 'brand' | 'success' | 'danger';
  icon?: string;
}) {
  const Component = badge.Component;
  return (
    <Component
      id={p.id}
      props={{ label: p.label, tone: p.tone ?? 'neutral', icon: p.icon }}
      theme={THEME}
      dispatch={noop}
    />
  );
}

function Btn(p: {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onTap?: boolean;
}) {
  const Component = button.Component;
  return (
    <Component
      id={p.id}
      props={{
        label: p.label,
        variant: p.variant ?? 'primary',
        size: p.size ?? 'md',
        iconPosition: 'left',
        fullWidth: false,
        enabled: true,
      }}
      theme={THEME}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    />
  );
}

function Dv(p: { id: string; inset?: number; thickness?: number }) {
  const Component = divider.Component;
  return (
    <Component
      id={p.id}
      props={{ inset: p.inset ?? 0, thickness: p.thickness ?? 1 }}
      dispatch={noop}
    />
  );
}

function Stk(p: {
  id: string;
  direction?: 'vertical' | 'horizontal';
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  style?: NodeStyle;
  onTap?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
  children?: ReactNode;
}) {
  const Component = stack.Component;
  const element = (
    <Component
      id={p.id}
      props={{
        direction: p.direction ?? 'vertical',
        spacing: p.spacing ?? 0,
        align: p.align ?? 'stretch',
        justify: p.justify ?? 'start',
        wrap: p.wrap ?? false,
      }}
      style={sty(p.style)}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    >
      {p.children}
    </Component>
  );
  if (!p.onLayout) return element;
  return (
    <View testID={`${p.id}-first-paint-wrapper`} onLayout={p.onLayout}>
      {element}
    </View>
  );
}

function ZStk(p: {
  id: string;
  align?:
    | 'topLeft'
    | 'top'
    | 'topRight'
    | 'left'
    | 'center'
    | 'right'
    | 'bottomLeft'
    | 'bottom'
    | 'bottomRight';
  style?: NodeStyle;
  onTap?: boolean;
  children?: ReactNode;
}) {
  const Component = zstack.Component;
  return (
    <Component
      id={p.id}
      props={{ align: p.align ?? 'center' }}
      style={sty(p.style)}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    >
      {p.children}
    </Component>
  );
}

function Rail(p: {
  id: string;
  spacing?: number;
  contentInset?: number;
  peek?: number;
  snap?: boolean;
  style?: NodeStyle;
  items: ReactNode[];
}) {
  const Component = rail.Component;
  const childNodes: SDUINodeShape[] = p.items.map((_, i) => ({ id: `${p.id}.item.${i}`, type: 'static' }));
  return (
    <Component
      id={p.id}
      props={{
        spacing: p.spacing ?? 0,
        snap: p.snap ?? false,
        peek: p.peek ?? 0,
        contentInset: p.contentInset ?? 0,
        showsIndicator: false,
      }}
      style={sty(p.style)}
      childNodes={childNodes}
      renderNode={(node) => p.items[Number(node.id.split('.').pop())] ?? null}
      dispatch={noop}
    />
  );
}

function Grid(p: { id: string; columns?: number; gap?: number; style?: NodeStyle; items: ReactNode[] }) {
  const Component = grid.Component;
  const childNodes: SDUINodeShape[] = p.items.map((_, i) => ({ id: `${p.id}.item.${i}`, type: 'static' }));
  return (
    <Component
      id={p.id}
      props={{ columns: p.columns ?? 2, gap: p.gap ?? 0 }}
      style={sty(p.style)}
      childNodes={childNodes}
      renderNode={(node) => p.items[Number(node.id.split('.').pop())] ?? null}
      dispatch={noop}
    />
  );
}

function Chips(p: { id: string; options: { label: string; value: string; icon?: string }[]; selected: string; style?: NodeStyle }) {
  const Component = chip_group.Component;
  return (
    <Component
      id={p.id}
      props={{ options: p.options, selected: p.selected, scrollable: false, multi: false }}
      style={sty(p.style)}
      theme={THEME}
      dispatch={noop}
    />
  );
}

function Inp(p: {
  id: string;
  placeholder?: string;
  placeholderRotation?: string[];
  rotationMs?: number;
  readOnly?: boolean;
  style?: NodeStyle;
  onTap?: boolean;
}) {
  const Component = input.Component;
  return (
    <Component
      id={p.id}
      props={{
        placeholder: p.placeholder ?? '',
        placeholderRotation: p.placeholderRotation ?? [],
        rotationMs: p.rotationMs ?? 3000,
        value: '',
        keyboard: 'default',
        readOnly: p.readOnly ?? false,
      }}
      style={sty(p.style)}
      actions={p.onTap ? { onTap: TAP } : undefined}
      dispatch={noop}
    />
  );
}

// ---- Content, duplicated by value from payloads/home.json ----

const WISHLISTED = [
  { id: 'c_w1', title: 'Maruti Suzuki Baleno', year: 2021, city: 'Bhilwara', km: '32,450 km', fuel: 'Petrol', transmission: 'Manual', rto: 'RJ27', price: '₹6.15 Lakh', emi: 'EMI ₹11,499/m*', badge: 'Zero Worry', badgeTone: 'success' as const, image: 'https://picsum.photos/seed/c_w1/400/300' },
  { id: 'c_w2', title: 'Hyundai Creta', year: 2019, city: 'Jaipur', km: '48,760 km', fuel: 'Diesel', transmission: 'Automatic', rto: 'RJ14', price: '₹9.87 Lakh', emi: 'EMI ₹17,250/m*', badge: 'Zero Worry Max', badgeTone: 'brand' as const, image: 'https://picsum.photos/seed/c_w2/400/300' },
  { id: 'c_w3', title: 'Tata Nexon', year: 2022, city: 'Delhi NCR', km: '18,120 km', fuel: 'Petrol', transmission: 'Manual', rto: 'DL8C', price: '₹8.42 Lakh', emi: 'EMI ₹14,980/m*', badge: 'Zero Worry', badgeTone: 'success' as const, image: 'https://picsum.photos/seed/c_w3/400/300' },
  { id: 'c_w4', title: 'Honda City', year: 2018, city: 'Bhilwara', km: '61,300 km', fuel: 'Petrol', transmission: 'Automatic', rto: 'RJ27', price: '₹6.89 Lakh', emi: 'EMI ₹12,340/m*', badge: 'Zero Worry Max', badgeTone: 'brand' as const, image: 'https://picsum.photos/seed/c_w4/400/300' },
];

const BUY_TILES = [
  { key: 'hatchback', label: 'Hatchback', image: 'https://picsum.photos/seed/tile_hatchback/200/200' },
  { key: 'sedan', label: 'Sedan', image: 'https://picsum.photos/seed/tile_sedan/200/200' },
  { key: 'suv', label: 'SUV', image: 'https://picsum.photos/seed/tile_suv/200/200' },
  { key: 'muv', label: 'MUV', image: 'https://picsum.photos/seed/tile_muv/200/200' },
  { key: 'automatic', label: 'Automatic', image: 'https://picsum.photos/seed/tile_automatic/200/200' },
];

const SELL_TILES = [
  { key: 'valuation', label: 'Free car valuation', image: 'https://picsum.photos/seed/tile_valuation/200/200' },
  { key: 'inspection', label: 'Doorstep inspection', image: 'https://picsum.photos/seed/tile_inspection/200/200' },
  { key: 'payment', label: 'Instant payment', image: 'https://picsum.photos/seed/tile_payment/200/200' },
  { key: 'rcTransfer', label: 'Free RC transfer', image: 'https://picsum.photos/seed/tile_rctransfer/200/200' },
];

const LOAN_TILES = [
  { key: 'newCar', label: 'New Car Loan', image: 'https://picsum.photos/seed/loan_newcar/160/160' },
  { key: 'usedCar', label: 'Used Car Loan', image: 'https://picsum.photos/seed/loan_usedcar/160/160' },
  { key: 'loanAgainstCar', label: 'Loan Against Car', image: 'https://picsum.photos/seed/loan_against/160/160' },
  { key: 'balanceTransfer', label: 'Balance Transfer', image: 'https://picsum.photos/seed/loan_balance/160/160' },
];

const SERVICE_TILES = [
  { key: 'rcTransfer', label: 'RC Transfer', image: 'https://picsum.photos/seed/svc_rctransfer/160/160' },
  { key: 'insurance', label: 'Car Insurance', image: 'https://picsum.photos/seed/svc_insurance/160/160' },
  { key: 'challan', label: 'Challan Check', image: 'https://picsum.photos/seed/svc_challan/160/160' },
  { key: 'fastag', label: 'FASTag Recharge', image: 'https://picsum.photos/seed/svc_fastag/160/160' },
  { key: 'valuation', label: 'Car Valuation', image: 'https://picsum.photos/seed/svc_valuation/160/160' },
  { key: 'subscription', label: 'Car Subscription', image: 'https://picsum.photos/seed/svc_subscription/160/160' },
];

const MANAGE_TILES = [
  { key: 'challan', label: 'Challan Check', image: 'https://picsum.photos/seed/mgmt_challan/160/160' },
  { key: 'fastag', label: 'FASTag Recharge', image: 'https://picsum.photos/seed/mgmt_fastag/160/160' },
  { key: 'insurance', label: 'Insurance Renewal', image: 'https://picsum.photos/seed/mgmt_insurance/160/160' },
  { key: 'rcDownload', label: 'RC Download', image: 'https://picsum.photos/seed/mgmt_rc/160/160' },
  { key: 'puc', label: 'PUC Certificate', image: 'https://picsum.photos/seed/mgmt_puc/160/160' },
  { key: 'roadside', label: 'Roadside Assistance', image: 'https://picsum.photos/seed/mgmt_roadside/160/160' },
];

const TRENDING = [
  { numeral: '01', name: 'Tata Punch', price: '₹6.10 Lakh onwards', image: 'https://picsum.photos/seed/trend_punch/300/220' },
  { numeral: '02', name: 'Hyundai Venue', price: '₹7.94 Lakh onwards', image: 'https://picsum.photos/seed/trend_venue/300/220' },
  { numeral: '03', name: 'Maruti Fronx', price: '₹7.51 Lakh onwards', image: 'https://picsum.photos/seed/trend_fronx/300/220' },
  { numeral: '04', name: 'Kia Sonet', price: '₹7.99 Lakh onwards', image: 'https://picsum.photos/seed/trend_sonet/300/220' },
];

const PROMO_RAIL = [
  { key: 'moneyBack', title: '30-Day Money-Back Guarantee', subtitle: 'Not happy? Return it, no questions asked', image: 'https://picsum.photos/seed/promo_moneyback/600/300' },
  { key: 'rcTransfer', title: 'Free RC Transfer', subtitle: 'On every used car purchase', image: 'https://picsum.photos/seed/promo_rctransfer/600/300' },
  { key: 'warranty', title: '1-Year Comprehensive Warranty', subtitle: 'Covered on every Cars24 car', image: 'https://picsum.photos/seed/promo_warranty/600/300' },
];

function BrandTile({ id, label, imageUrl, bg }: { id: string; label: string; imageUrl: string; bg: string }) {
  return (
    <Stk id={id} direction="vertical" justify="between" spacing={8} onTap style={{ background: bg, radius: 'radius.md', padding: 'space.md', width: 132, height: 148 }}>
      <T id={`${id}.text`} value={label} variant="type.body" color="color.textOnBrand" />
      <Img id={`${id}.image`} url={imageUrl} aspectRatio={1} contentMode="contain" style={{ width: 72, height: 72 }} />
    </Stk>
  );
}

function CircleTile({ id, label, imageUrl }: { id: string; label: string; imageUrl: string }) {
  return (
    <Stk id={id} direction="vertical" align="center" spacing={8} onTap style={{ width: 84 }}>
      <Img id={`${id}.image`} url={imageUrl} aspectRatio={1} radius="radius.pill" contentMode="cover" style={{ width: 64, height: 64, background: 'color.surfaceRaised' }} />
      <T id={`${id}.text`} value={label} variant="type.caption" align="center" />
    </Stk>
  );
}

function CreamTile({ id, label, imageUrl }: { id: string; label: string; imageUrl: string }) {
  return (
    <Stk id={id} direction="vertical" justify="between" spacing={8} onTap style={{ background: 'color.tileCream', radius: 'radius.md', padding: 'space.md', height: 112 }}>
      <T id={`${id}.text`} value={label} variant="type.caption" color="color.textPrimary" />
      <Img id={`${id}.image`} url={imageUrl} aspectRatio={1} contentMode="contain" style={{ width: 40, height: 40 }} />
    </Stk>
  );
}

function ManageTile({ id, label, imageUrl }: { id: string; label: string; imageUrl: string }) {
  return (
    <Stk id={id} direction="vertical" justify="between" spacing={8} onTap style={{ background: 'color.bg', radius: 'radius.md', padding: 'space.md', height: 112 }}>
      <T id={`${id}.text`} value={label} variant="type.caption" />
      <Img id={`${id}.image`} url={imageUrl} aspectRatio={1} contentMode="contain" style={{ width: 40, height: 40 }} />
    </Stk>
  );
}

function UsedCarCard({ id, car }: { id: string; car: (typeof WISHLISTED)[number] }) {
  return (
    <Stk id={id} direction="vertical" spacing={4} onTap style={{ background: 'color.bg', borderColor: 'color.border', borderWidth: 1, radius: 'radius.md', width: 176 }}>
      <Img id={`${id}.image`} url={car.image} aspectRatio={1.4} radius="radius.md" contentMode="cover" />
      <Stk id={`${id}.body`} direction="vertical" spacing={4} style={{ paddingX: 'space.sm', paddingY: 'space.sm' }}>
        <Bdg id={`${id}.badge`} label={car.badge} tone={car.badgeTone} />
        <T id={`${id}.title`} value={car.title} variant="type.body" maxLines={1} />
        <T id={`${id}.specs`} value={`${car.km} • ${car.fuel} • ${car.transmission}`} variant="type.caption" color="color.textMuted" />
        <T id={`${id}.rto`} value={`${car.year} • ${car.rto} • ${car.city}`} variant="type.caption" color="color.textMuted" />
        <Stk id={`${id}.priceRow`} direction="horizontal" justify="between" align="center">
          <T id={`${id}.price`} value={car.price} variant="type.body" />
          <T id={`${id}.emi`} value={car.emi} variant="type.caption" color="color.textMuted" />
        </Stk>
      </Stk>
    </Stk>
  );
}

function TrendingItem({ id, item }: { id: string; item: (typeof TRENDING)[number] }) {
  return (
    <ZStk id={id} align="bottomLeft" onTap style={{ width: 168 }}>
      <T id={`${id}.numeral`} value={item.numeral} variant="type.ghost" color="color.surfaceRaised" opacity={0.6} />
      <Stk id={`${id}.content`} direction="vertical" spacing={4} style={{ padding: 'space.sm' }}>
        <Img id={`${id}.image`} url={item.image} aspectRatio={1.4} radius="radius.sm" contentMode="cover" />
        <T id={`${id}.name`} value={item.name} variant="type.body" />
        <T id={`${id}.price`} value={item.price} variant="type.caption" color="color.textMuted" />
      </Stk>
    </ZStk>
  );
}

function PromoCard({ id, item }: { id: string; item: (typeof PROMO_RAIL)[number] }) {
  return (
    <ZStk id={id} align="bottomLeft" onTap style={{ width: 260, height: 130, radius: 'radius.md' }}>
      <Img id={`${id}.bg`} url={item.image} contentMode="cover" style={{ radius: 'radius.md', width: '100%', height: '100%' }} />
      <Stk id={`${id}.scrim`} direction="vertical" style={{ background: 'color.scrim', radius: 'radius.md', width: '100%', height: '100%' }} />
      <Stk id={`${id}.content`} direction="vertical" spacing={2} style={{ padding: 'space.md' }}>
        <T id={`${id}.title`} value={item.title} variant="type.body" color="color.textOnBrand" />
        <T id={`${id}.subtitle`} value={item.subtitle} variant="type.caption" color="color.textOnBrand" />
      </Stk>
    </ZStk>
  );
}

export function StaticHome({
  onFirstPaint,
  onContentSizeChange,
}: {
  onFirstPaint?: () => void;
  onContentSizeChange?: () => void;
}): React.ReactElement {
  return (
    <GestureHandlerRootView testID="static-home-root" style={{ flex: 1, backgroundColor: THEME.color.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView testID="static-home-scroll" onContentSizeChange={onContentSizeChange}>
          {/* Header */}
          <Stk id="home.header" direction="vertical" spacing={12} style={{ paddingX: 'space.lg', paddingY: 'space.md', background: 'color.bg' }}>
            <Stk id="home.header.topRow" direction="horizontal" justify="between" align="center">
              <Stk id="home.header.location" direction="horizontal" align="center" spacing={4} onTap>
                <Ic id="home.header.location.icon" name="location-outline" size={18} color="color.textPrimary" />
                <T id="home.header.location.text" value="Bhilwara" variant="type.body" />
                <Ic id="home.header.location.chevron" name="chevron-down" size={14} color="color.textMuted" />
              </Stk>
              <Img
                id="home.header.avatar"
                url="https://picsum.photos/seed/home_avatar/100/100"
                aspectRatio={1}
                radius="radius.pill"
                contentMode="cover"
                style={{ width: 36, height: 36 }}
                onTap
              />
            </Stk>
            <Inp
              id="home.header.search"
              placeholder="Search cars"
              placeholderRotation={['Search Baleno', 'Search Ertiga', 'Search Tata cars', 'Search FASTag']}
              rotationMs={3000}
              readOnly
              style={{ background: 'color.surfaceRaised', radius: 'radius.md', paddingX: 'space.md', paddingY: 'space.sm' }}
              onTap
            />
            <Stk id="home.header.nav" direction="horizontal" justify="between" style={{ paddingY: 'space.sm' }}>
              <Stk id="home.header.nav.buy" direction="vertical" align="center" spacing={4} onTap>
                <Ic id="home.header.nav.buy.icon" name="car-outline" size={22} color="color.brand" />
                <T id="home.header.nav.buy.text" value="Buy" variant="type.caption" />
              </Stk>
              <Stk id="home.header.nav.sell" direction="vertical" align="center" spacing={4} onTap>
                <Ic id="home.header.nav.sell.icon" name="cash-outline" size={22} color="color.brand" />
                <T id="home.header.nav.sell.text" value="Sell" variant="type.caption" />
              </Stk>
              <Stk id="home.header.nav.loans" direction="vertical" align="center" spacing={4} onTap>
                <Ic id="home.header.nav.loans.icon" name="wallet-outline" size={22} color="color.brand" />
                <T id="home.header.nav.loans.text" value="Loans" variant="type.caption" />
              </Stk>
              <Stk id="home.header.nav.services" direction="vertical" align="center" spacing={4} onTap>
                <Ic id="home.header.nav.services.icon" name="construct-outline" size={22} color="color.brand" />
                <T id="home.header.nav.services.text" value="Services" variant="type.caption" />
              </Stk>
            </Stk>
          </Stk>

          {/* 1 — Buy a car (first section: carries the firstPaint marker) */}
          <Stk
            id="home.buyCar"
            direction="vertical"
            spacing={12}
            style={{ paddingY: 'space.lg' }}
            onLayout={onFirstPaint ? () => onFirstPaint() : undefined}
          >
            <Stk id="home.buyCar.header" direction="horizontal" justify="between" align="center" style={{ paddingX: 'space.lg' }}>
              <Stk id="home.buyCar.header.left" direction="horizontal" align="center" spacing={8}>
                <T id="home.buyCar.header.title" value="Buy a car" variant="type.h2" />
                <Bdg id="home.buyCar.header.badge" label="Up to ₹80,000 off" tone="brand" />
              </Stk>
            </Stk>
            <Rail id="home.buyCar.rail" spacing={12} contentInset={16} peek={24} items={BUY_TILES.map((t) => (
              <BrandTile key={t.key} id={`home.buyCar.tile.${t.key}`} label={t.label} imageUrl={t.image} bg="color.tileBlue" />
            ))} />
          </Stk>

          {/* 2 — Sell your car */}
          <Stk id="home.sellCar" direction="vertical" spacing={12} style={{ paddingY: 'space.lg' }}>
            <T id="home.sellCar.title" value="Sell your car" variant="type.h2" style={{ paddingX: 'space.lg' }} />
            <Rail id="home.sellCar.rail" spacing={12} contentInset={16} peek={24} items={SELL_TILES.map((t) => (
              <BrandTile key={t.key} id={`home.sellCar.tile.${t.key}`} label={t.label} imageUrl={t.image} bg="color.tileGreen" />
            ))} />
          </Stk>

          {/* 3 — Get car loans */}
          <Stk id="home.loans" direction="vertical" spacing={12} style={{ paddingY: 'space.lg' }}>
            <T id="home.loans.title" value="Get car loans" variant="type.h2" style={{ paddingX: 'space.lg' }} />
            <Rail id="home.loans.rail" spacing={16} contentInset={16} peek={24} items={LOAN_TILES.map((t) => (
              <CircleTile key={t.key} id={`home.loans.tile.${t.key}`} label={t.label} imageUrl={t.image} />
            ))} />
          </Stk>

          {/* 4 — Car check & services */}
          <Stk id="home.services" direction="vertical" spacing={12} style={{ paddingY: 'space.lg' }}>
            <T id="home.services.title" value="Car check & services" variant="type.h2" style={{ paddingX: 'space.lg' }} />
            <Grid id="home.services.grid" columns={3} gap={12} style={{ paddingX: 'space.lg' }} items={SERVICE_TILES.map((t) => (
              <CreamTile key={t.key} id={`home.services.tile.${t.key}`} label={t.label} imageUrl={t.image} />
            ))} />
          </Stk>

          {/* 5 — Used cars you'll love (default tab: wishlisted, matching state.carListTab default) */}
          <Stk id="home.usedCars" direction="vertical" spacing={12} style={{ paddingY: 'space.lg' }}>
            <Stk id="home.usedCars.header" direction="horizontal" justify="between" align="center" style={{ paddingX: 'space.lg' }}>
              <Stk id="home.usedCars.header.left" direction="horizontal" align="center" spacing={8}>
                <T id="home.usedCars.header.title" value="Used cars you'll love" variant="type.h2" />
              </Stk>
              <T id="home.usedCars.header.link" value="View all" variant="type.body" color="color.accent" onTap />
            </Stk>
            <Chips
              id="home.usedCars.tabs"
              options={[
                { label: 'Wishlisted', value: 'wishlisted', icon: 'heart-outline' },
                { label: 'Hot deals', value: 'hotDeals', icon: 'flame-outline' },
              ]}
              selected="wishlisted"
              style={{ paddingX: 'space.lg' }}
            />
            <Rail id="home.usedCars.rail.wishlisted" spacing={12} contentInset={16} peek={24} items={WISHLISTED.map((car) => (
              <UsedCarCard key={car.id} id={`home.usedCars.card.${car.id}`} car={car} />
            ))} />
          </Stk>

          {/* 6 — Manage your vehicle */}
          <Stk id="home.manageVehicle" direction="vertical" spacing={12} style={{ background: 'color.brandSurface', paddingY: 'space.lg' }}>
            <Stk id="home.manageVehicle.header" direction="horizontal" justify="between" align="center" style={{ paddingX: 'space.lg' }}>
              <Stk id="home.manageVehicle.header.left" direction="horizontal" align="center" spacing={8}>
                <T id="home.manageVehicle.header.title" value="Manage your vehicle" variant="type.h2" color="color.textOnBrand" />
              </Stk>
              <T id="home.manageVehicle.header.link" value="View all" variant="type.body" color="color.textOnBrand" onTap />
            </Stk>
            <Grid id="home.manageVehicle.grid" columns={3} gap={12} style={{ paddingX: 'space.lg' }} items={MANAGE_TILES.map((t) => (
              <ManageTile key={t.key} id={`home.manageVehicle.tile.${t.key}`} label={t.label} imageUrl={t.image} />
            ))} />
          </Stk>

          {/* 7 — Spotify promo */}
          <ZStk id="home.spotifyPromo" align="bottomLeft" onTap style={{ paddingX: 'space.lg', marginY: 'space.md', radius: 'radius.lg', height: 180 }}>
            <Img id="home.spotifyPromo.bg" url="https://picsum.photos/seed/promo_spotify/800/400" contentMode="cover" style={{ radius: 'radius.lg', width: '100%', height: '100%' }} />
            <Stk id="home.spotifyPromo.scrim" direction="vertical" style={{ background: 'color.scrim', radius: 'radius.lg', width: '100%', height: '100%' }} />
            <Stk id="home.spotifyPromo.content" direction="vertical" spacing={4} style={{ padding: 'space.lg' }}>
              <Img id="home.spotifyPromo.logo" url="https://picsum.photos/seed/spotify_logo/80/80" aspectRatio={1} contentMode="contain" style={{ width: 28, height: 28 }} />
              <T id="home.spotifyPromo.title" value="Cars24 x Spotify" variant="type.h2" color="color.textOnBrand" />
              <T id="home.spotifyPromo.subtitle" value="Unlimited music on every test drive" variant="type.body" color="color.textOnBrand" />
              <Btn id="home.spotifyPromo.cta" label="Know more" variant="outline" size="sm" onTap />
            </Stk>
          </ZStk>

          {/* 8 — Trending new cars */}
          <Stk id="home.trending" direction="vertical" spacing={12} style={{ paddingY: 'space.lg' }}>
            <Stk id="home.trending.header" direction="horizontal" justify="between" align="center" style={{ paddingX: 'space.lg' }}>
              <Stk id="home.trending.header.left" direction="horizontal" align="center" spacing={8}>
                <T id="home.trending.header.title" value="Trending new cars" variant="type.h2" />
              </Stk>
              <T id="home.trending.header.link" value="View all" variant="type.body" color="color.accent" onTap />
            </Stk>
            <Rail id="home.trending.rail" spacing={12} contentInset={16} peek={24} items={TRENDING.map((item, i) => (
              <TrendingItem key={item.numeral} id={`home.trending.item.${i + 1}`} item={item} />
            ))} />
          </Stk>

          {/* 9 — Find your match */}
          <Stk id="home.findMatch" direction="vertical" spacing={12} style={{ marginX: 'space.lg', marginY: 'space.md', padding: 'space.lg', background: 'color.surfaceRaised', radius: 'radius.lg' }}>
            <Stk id="home.findMatch.top" direction="horizontal" spacing={12} align="center">
              <Img id="home.findMatch.image" url="https://picsum.photos/seed/find_expert/160/160" aspectRatio={1} radius="radius.pill" contentMode="cover" style={{ width: 56, height: 56 }} />
              <Stk id="home.findMatch.text" direction="vertical" spacing={4}>
                <Bdg id="home.findMatch.new" label="NEW" tone="success" />
                <T id="home.findMatch.title" value="Talk to a car expert" variant="type.body" />
                <T id="home.findMatch.subtitle" value="Get personalised recommendations in 2 mins" variant="type.caption" color="color.textMuted" />
              </Stk>
            </Stk>
            <Dv id="home.findMatch.divider" inset={0} thickness={1} />
            <Stk id="home.findMatch.cta" direction="horizontal" justify="between" align="center" onTap>
              <T id="home.findMatch.cta.text" value="Request a callback" variant="type.body" color="color.accent" />
              <Ic id="home.findMatch.cta.icon" name="chevron-forward" size={16} color="color.accent" />
            </Stk>
          </Stk>

          {/* 10 — Promo rail */}
          <Rail id="home.promoRail" spacing={12} contentInset={16} peek={32} snap style={{ paddingY: 'space.md' }} items={PROMO_RAIL.map((item) => (
            <PromoCard key={item.key} id={`home.promoRail.item.${item.key}`} item={item} />
          ))} />

          {/* 11 — CrashFree India */}
          <ZStk id="home.crashFreeIndia" align="bottomLeft" onTap style={{ paddingX: 'space.lg', marginY: 'space.md', radius: 'radius.lg', height: 200 }}>
            <Img id="home.crashFreeIndia.bg" url="https://picsum.photos/seed/promo_crashfree/800/450" contentMode="cover" style={{ radius: 'radius.lg', width: '100%', height: '100%' }} />
            <Stk id="home.crashFreeIndia.scrim" direction="vertical" style={{ background: 'color.scrim', radius: 'radius.lg', width: '100%', height: '100%' }} />
            <Stk id="home.crashFreeIndia.content" direction="vertical" spacing={4} style={{ padding: 'space.lg' }}>
              <T id="home.crashFreeIndia.title" value="CrashFree India" variant="type.h2" color="color.textOnBrand" />
              <T id="home.crashFreeIndia.subtitle" value="Every Cars24 car passes a 200-point quality check" variant="type.body" color="color.textOnBrand" />
              <T id="home.crashFreeIndia.disclaimer" value="T&C apply" variant="type.caption" color="color.textOnBrand" opacity={0.8} />
              <Btn id="home.crashFreeIndia.cta" label="Know more" variant="outline" size="sm" onTap />
            </Stk>
          </ZStk>

          {/* 12 — Footer */}
          <Stk id="home.footer" direction="vertical" spacing={8} align="center" style={{ background: 'color.brand', paddingX: 'space.lg', paddingY: 'space.xl' }}>
            <T id="home.footer.brand" value="Cars24" variant="type.h1" color="color.textOnBrand" align="center" />
            <T id="home.footer.tagline" value="India's largest auto platform. Buy, sell and finance cars with confidence." variant="type.caption" color="color.textOnBrand" align="center" />
          </Stk>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
