import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  image,
  setImagePreloadEnabled,
  setPreloadedImageLoadReporter,
} from '../../../components/atoms/image';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: {},
  space: {},
  radius: { md: 12 },
  type: {},
};

function flatStyle(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('image', () => {
  test('renders acceptably given only required props (url)', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1')).toBeTruthy();
  });

  test('passes the url through as the image source', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.source).toMatchObject({ uri: 'https://example.com/car.png' });
  });

  test('defaults contentFit to "cover"', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.contentFit).toBe('cover');
  });

  test('contentMode maps to contentFit', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png', contentMode: 'contain' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.contentFit).toBe('contain');
  });

  test('aspectRatio is applied to the image style', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png', aspectRatio: 1.5 })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('img1')).toMatchObject({ aspectRatio: 1.5 });
  });

  test('radius resolves a token to borderRadius', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png', radius: 'radius.md' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(flatStyle('img1')).toMatchObject({ borderRadius: 12 });
  });

  // docs/PROMPTS.md P7 item 5 gated this. `preload` used to raise priority unconditionally;
  // now the payload flag only declares intent and the client decides whether to act on it, so
  // that marking images `preload` in home.json doesn't silently change the P7 baseline build
  // it's supposed to be measured against.
  test('preload alone does not raise load priority', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png', preload: true })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.priority).toBe('normal');
  });

  test('preload raises load priority once the client opts in', async () => {
    setImagePreloadEnabled(true);
    try {
      await render(
        <image.Component
          id="img1"
          props={image.propsSchema.parse({ url: 'https://example.com/car.png', preload: true })}
          theme={theme}
          dispatch={jest.fn()}
        />
      );
      expect(screen.getByTestId('img1').props.priority).toBe('high');
    } finally {
      setImagePreloadEnabled(false);
    }
  });

  test('a preloaded image reports its load; a normal one does not', async () => {
    const report = jest.fn();
    setPreloadedImageLoadReporter(report);
    try {
      await render(
        <image.Component
          id="img1"
          props={image.propsSchema.parse({ url: 'https://example.com/car.png', preload: true })}
          theme={theme}
          dispatch={jest.fn()}
        />
      );
      expect(screen.getByTestId('img1').props.onLoad).toBe(report);

      await render(
        <image.Component
          id="img2"
          props={image.propsSchema.parse({ url: 'https://example.com/other.png' })}
          theme={theme}
          dispatch={jest.fn()}
        />
      );
      expect(screen.getByTestId('img2').props.onLoad).toBeUndefined();
    } finally {
      setPreloadedImageLoadReporter(undefined);
    }
  });

  test('without preload, priority is normal', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.priority).toBe('normal');
  });

  test('placeholder is passed through', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png', placeholder: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.placeholder).toBe('L6PZfSi_.AyE_3t7t7R**0o#DgR4');
  });

  test('with no onTap action, does not intercept touches', async () => {
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png' })}
        theme={theme}
        dispatch={jest.fn()}
      />
    );
    expect(screen.getByTestId('img1').props.onPress).toBeUndefined();
  });

  test('pressing dispatches the declared onTap action', async () => {
    const dispatch = jest.fn();
    await render(
      <image.Component
        id="img1"
        props={image.propsSchema.parse({ url: 'https://example.com/car.png' })}
        theme={theme}
        actions={{ onTap: { type: 'navigate', payload: { route: 'pdp' } } }}
        dispatch={dispatch}
      />
    );

    await fireEvent.press(screen.getByTestId('img1'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', payload: { route: 'pdp' } });
  });
});
