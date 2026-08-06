import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { car_card, car_card_v2 } from '../../../components/composites/car_card';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: {
    brand: '#3B24C4',
    success: '#12B76A',
    textOnBrand: '#FFFFFF',
    textPrimary: '#101828',
    textMuted: '#667085',
    surfaceRaised: '#F5F6F8',
  },
  space: { xs: 4, sm: 8 },
  radius: { md: 12, pill: 999 },
  type: { body: { size: 14, weight: '500' }, caption: { size: 12, weight: '400' } },
};

describe('car_card@1', () => {
  const baseProps = car_card.propsSchema.parse({
    title: 'Maruti Suzuki Baleno',
    specs: '32,450 km • Petrol • Manual',
    rto: '2021 • RJ27 • Bhilwara',
    imageUrl: 'https://example.com/c.png',
    badgeLabel: 'Zero Worry',
    badgeTone: 'success',
    price: '₹6.15 Lakh',
    emi: 'EMI ₹11,499/m*',
  });

  test('renders title, specs, rto and price/EMI from flat props', async () => {
    await render(
      <car_card.Component id="c1" props={baseProps} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('Maruti Suzuki Baleno')).toBeTruthy();
    expect(screen.getByText('₹6.15 Lakh')).toBeTruthy();
    expect(screen.getByText('EMI ₹11,499/m*')).toBeTruthy();
  });

  test('priceNegotiable swaps the EMI line for "Price negotiable"', async () => {
    const props = car_card.propsSchema.parse({ ...baseProps, priceNegotiable: true, emi: undefined });
    await render(<car_card.Component id="c1" props={props} theme={theme} dispatch={jest.fn()} />);
    expect(screen.getByText('Price negotiable')).toBeTruthy();
    expect(screen.queryByText('EMI ₹11,499/m*')).toBeNull();
  });

  test('tapping the card dispatches onTap', async () => {
    const dispatch = jest.fn();
    const onTap = { type: 'navigate' as const, payload: { route: 'pdp' } };
    await render(
      <car_card.Component id="c1" props={baseProps} theme={theme} actions={{ onTap }} dispatch={dispatch} />
    );
    fireEvent.press(screen.getByTestId('c1'));
    expect(dispatch).toHaveBeenCalledWith(onTap);
  });
});

describe('car_card@2', () => {
  test('renders from the collapsed priceLine object instead of flat price/emi props', async () => {
    const props = car_card_v2.propsSchema.parse({
      title: 'Hyundai Creta',
      specs: '48,760 km • Diesel • Automatic',
      rto: '2019 • RJ14 • Jaipur',
      imageUrl: 'https://example.com/c.png',
      badgeLabel: 'Zero Worry Max',
      badgeTone: 'brand',
      priceLine: { amount: '₹9.87 Lakh', emi: 'EMI ₹17,250/m*' },
    });
    await render(
      <car_card_v2.Component id="c2" props={props} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('₹9.87 Lakh')).toBeTruthy();
    expect(screen.getByText('EMI ₹17,250/m*')).toBeTruthy();
  });

  test('priceLine.negotiable swaps the EMI line for "Price negotiable"', async () => {
    const props = car_card_v2.propsSchema.parse({
      title: 'Hyundai Creta',
      specs: '48,760 km • Diesel • Automatic',
      rto: '2019 • RJ14 • Jaipur',
      imageUrl: 'https://example.com/c.png',
      badgeLabel: 'Zero Worry Max',
      badgeTone: 'brand',
      priceLine: { amount: '₹9.87 Lakh', negotiable: true },
    });
    await render(
      <car_card_v2.Component id="c2" props={props} theme={theme} dispatch={jest.fn()} />
    );
    expect(screen.getByText('Price negotiable')).toBeTruthy();
  });

  test('rejects the old flat price/emi shape — this is why @2 is a new typeVersion, not an additive prop on @1', () => {
    const result = car_card_v2.propsSchema.safeParse({
      title: 'Hyundai Creta',
      specs: '48,760 km • Diesel • Automatic',
      rto: '2019 • RJ14 • Jaipur',
      imageUrl: 'https://example.com/c.png',
      badgeLabel: 'Zero Worry Max',
      price: '₹9.87 Lakh',
      emi: 'EMI ₹17,250/m*',
    });
    expect(result.success).toBe(false);
  });
});
