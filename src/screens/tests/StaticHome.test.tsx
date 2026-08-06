import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { StaticHome } from '../StaticHome';

describe('StaticHome', () => {
  test('renders every section of the home screen without a payload', async () => {
    await render(<StaticHome />);

    // Header
    expect(screen.getByText('Bhilwara')).toBeTruthy();
    expect(screen.getByText('Buy')).toBeTruthy();

    // Sections 1-6
    expect(screen.getByText('Buy a car')).toBeTruthy();
    expect(screen.getByText('Sell your car')).toBeTruthy();
    expect(screen.getByText('Get car loans')).toBeTruthy();
    expect(screen.getByText('Car check & services')).toBeTruthy();
    expect(screen.getByText("Used cars you'll love")).toBeTruthy();
    expect(screen.getByText('Manage your vehicle')).toBeTruthy();

    // Used-car card content (default wishlisted tab) and the hidden hotDeals tab's own cars
    // are not present — matching state.carListTab's default in home.json.
    expect(screen.getByText('Maruti Suzuki Baleno')).toBeTruthy();
    expect(screen.queryByText('Maruti Suzuki Swift')).toBeNull();

    // Sections 7-12
    expect(screen.getByText('Cars24 x Spotify')).toBeTruthy();
    expect(screen.getByText('Trending new cars')).toBeTruthy();
    expect(screen.getByText('Talk to a car expert')).toBeTruthy();
    expect(screen.getByText('30-Day Money-Back Guarantee')).toBeTruthy();
    expect(screen.getByText('CrashFree India')).toBeTruthy();
    expect(screen.getByText('Cars24')).toBeTruthy();
  });

  test('fires onFirstPaint when the first section lays out and onContentSizeChange when the scroll content settles', async () => {
    const onFirstPaint = jest.fn();
    const onContentSizeChange = jest.fn();
    await render(<StaticHome onFirstPaint={onFirstPaint} onContentSizeChange={onContentSizeChange} />);

    fireEvent(screen.getByTestId('home.buyCar-first-paint-wrapper'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 220 } },
    });
    expect(onFirstPaint).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId('static-home-scroll'), 'contentSizeChange', 360, 4000);
    expect(onContentSizeChange).toHaveBeenCalledTimes(1);
  });
});
