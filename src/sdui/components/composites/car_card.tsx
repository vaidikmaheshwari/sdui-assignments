import React from 'react';
import { Pressable, Text as RNText, View, type TextStyle, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { z } from 'zod';
import type { ComponentDefinition } from '../../core/types';
import { resolveToken } from '../../core/theme';

const BADGE_TONE = z.enum(['neutral', 'brand', 'success', 'danger']);

const TONE_TOKENS: Record<z.infer<typeof BADGE_TONE>, { background: string; text: string }> = {
  neutral: { background: 'color.surfaceRaised', text: 'color.textPrimary' },
  brand: { background: 'color.brand', text: 'color.textOnBrand' },
  success: { background: 'color.success', text: 'color.textOnBrand' },
  danger: { background: 'color.danger', text: 'color.textOnBrand' },
};

function useResolvedTokens(theme: import('../../core/types').ThemeTokens | undefined) {
  return {
    body: theme ? (resolveToken('body', 'type.body', 'type', theme) as { size: number; weight: string } | undefined) : undefined,
    caption: theme
      ? (resolveToken('caption', 'type.caption', 'type', theme) as { size: number; weight: string } | undefined)
      : undefined,
    textPrimary: theme ? (resolveToken('textPrimary', 'color.textPrimary', 'color', theme) as string | undefined) : undefined,
    textMuted: theme ? (resolveToken('textMuted', 'color.textMuted', 'color', theme) as string | undefined) : undefined,
    radiusMd: theme ? (resolveToken('radiusMd', 'radius.md', 'radius', theme) as number | undefined) : undefined,
  };
}

function badgeTone(theme: import('../../core/types').ThemeTokens | undefined, tone: z.infer<typeof BADGE_TONE>) {
  const { background, text } = TONE_TOKENS[tone];
  return {
    background: theme ? (resolveToken('badge', background, 'color', theme) as string | undefined) : undefined,
    text: theme ? (resolveToken('badge', text, 'color', theme) as string | undefined) : undefined,
  };
}

function CardShell({
  id,
  style,
  imageUrl,
  radius,
  badgeLabel,
  badgeColors,
  title,
  specs,
  rto,
  priceRow,
  onPress,
}: {
  id: string;
  style?: ViewStyle;
  imageUrl: string;
  radius?: number;
  badgeLabel: string;
  badgeColors: { background?: string; text?: string };
  title: string;
  specs: string;
  rto: string;
  priceRow: React.ReactNode;
  onPress?: () => void;
}) {
  const imageStyle: ImageStyle = { width: '100%', aspectRatio: 1.4, borderRadius: radius };
  const badgeStyle: ViewStyle = {
    alignSelf: 'flex-start',
    backgroundColor: badgeColors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  };
  const titleStyle: TextStyle = { fontWeight: '500', color: undefined };
  const captionStyle: TextStyle = { fontSize: 12 };

  const content = (
    <>
      <Image source={{ uri: imageUrl }} style={imageStyle} contentFit="cover" />
      <View style={{ gap: 4, paddingTop: 8 }}>
        <View style={badgeStyle}>
          <RNText style={{ color: badgeColors.text, fontSize: 12 }}>{badgeLabel}</RNText>
        </View>
        <RNText style={titleStyle} numberOfLines={1}>
          {title}
        </RNText>
        <RNText style={captionStyle} numberOfLines={1}>
          {specs}
        </RNText>
        <RNText style={captionStyle} numberOfLines={1}>
          {rto}
        </RNText>
        {priceRow}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable testID={id} style={[{ width: 220 }, style]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={id} style={[{ width: 220 }, style]}>
      {content}
    </View>
  );
}

// ---- car_card@1 — flat price/EMI props, mirrors payloads/home.json's raw composition ----

const propsSchemaV1 = z.object({
  title: z.string(),
  specs: z.string(),
  rto: z.string(),
  imageUrl: z.string(),
  badgeLabel: z.string(),
  badgeTone: BADGE_TONE.default('neutral'),
  price: z.string(),
  emi: z.string().optional(),
  priceNegotiable: z.boolean().default(false),
});

type CarCardPropsV1 = z.infer<typeof propsSchemaV1>;

export const car_card: ComponentDefinition<CarCardPropsV1> = {
  type: 'car_card',
  typeVersion: 1,
  propsSchema: propsSchemaV1,
  defaults: { badgeTone: 'neutral', priceNegotiable: false },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const tokens = useResolvedTokens(theme);
    const colors = badgeTone(theme, props.badgeTone);

    return (
      <CardShell
        id={id}
        style={style as ViewStyle}
        imageUrl={props.imageUrl}
        radius={tokens.radiusMd}
        badgeLabel={props.badgeLabel}
        badgeColors={colors}
        title={props.title}
        specs={props.specs}
        rto={props.rto}
        priceRow={
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <RNText style={{ fontWeight: '600' }}>{props.price}</RNText>
            <RNText style={{ fontSize: 12, color: tokens.textMuted }}>
              {props.priceNegotiable ? 'Price negotiable' : props.emi}
            </RNText>
          </View>
        }
        onPress={actions?.onTap ? () => dispatch(actions.onTap!) : undefined}
      />
    );
  },
};

// ---- car_card@2 — breaking change: price/emi/priceNegotiable collapse into one
// `priceLine` object, because the server started sending one pre-formatted pricing
// unit instead of three loosely-related fields. Not additive, hence the version bump
// (SCHEMA.md §10.3/§10.4) rather than a new optional prop on @1. ----

const priceLineSchema = z.object({
  amount: z.string(),
  emi: z.string().optional(),
  negotiable: z.boolean().default(false),
});

const propsSchemaV2 = z.object({
  title: z.string(),
  specs: z.string(),
  rto: z.string(),
  imageUrl: z.string(),
  badgeLabel: z.string(),
  badgeTone: BADGE_TONE.default('neutral'),
  priceLine: priceLineSchema,
});

type CarCardPropsV2 = z.infer<typeof propsSchemaV2>;

export const car_card_v2: ComponentDefinition<CarCardPropsV2> = {
  type: 'car_card',
  typeVersion: 2,
  propsSchema: propsSchemaV2,
  defaults: { badgeTone: 'neutral' },
  Component: ({ id, props, style, theme, actions, dispatch }) => {
    const tokens = useResolvedTokens(theme);
    const colors = badgeTone(theme, props.badgeTone);

    return (
      <CardShell
        id={id}
        style={style as ViewStyle}
        imageUrl={props.imageUrl}
        radius={tokens.radiusMd}
        badgeLabel={props.badgeLabel}
        badgeColors={colors}
        title={props.title}
        specs={props.specs}
        rto={props.rto}
        priceRow={
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <RNText style={{ fontWeight: '600' }}>{props.priceLine.amount}</RNText>
            <RNText style={{ fontSize: 12, color: tokens.textMuted }}>
              {props.priceLine.negotiable ? 'Price negotiable' : props.priceLine.emi}
            </RNText>
          </View>
        }
        onPress={actions?.onTap ? () => dispatch(actions.onTap!) : undefined}
      />
    );
  },
};
