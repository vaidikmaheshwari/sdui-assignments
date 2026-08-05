import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { rating } from '../../../components/atoms/rating';
import type { ThemeTokens } from '../../../core/types';

const theme: ThemeTokens = {
  color: { brand: '#3B24C4' },
  space: {},
  radius: {},
  type: {},
};

function starGlyphs(containerTestId: string) {
  return screen.getByTestId(containerTestId).children.map((star) => (star as { children: unknown[] }).children[0]);
}

describe('rating', () => {
  test('renders acceptably given only required props (value)', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 4 })} theme={theme} dispatch={jest.fn()} />);
    expect(screen.getByTestId('r1')).toBeTruthy();
  });

  test('defaults max to 5 stars', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 4 })} theme={theme} dispatch={jest.fn()} />);
    expect(screen.getByTestId('r1').children).toHaveLength(5);
  });

  test('max overrides the star count', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 2, max: 10 })} theme={theme} dispatch={jest.fn()} />);
    expect(screen.getByTestId('r1').children).toHaveLength(10);
  });

  test('value 0 renders every star as an outline, all identical', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 0 })} theme={theme} dispatch={jest.fn()} />);
    const glyphs = starGlyphs('r1');
    expect(new Set(glyphs).size).toBe(1);
  });

  test('an integer value fills exactly that many stars, leaving the rest as outlines', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 3, max: 5 })} theme={theme} dispatch={jest.fn()} />);
    const glyphs = starGlyphs('r1');
    // stars 0,1,2 are filled and identical to each other; stars 3,4 are outlines and identical to each other;
    // the two groups differ from one another.
    expect(glyphs[0]).toBe(glyphs[1]);
    expect(glyphs[1]).toBe(glyphs[2]);
    expect(glyphs[3]).toBe(glyphs[4]);
    expect(glyphs[2]).not.toBe(glyphs[3]);
  });

  test('a fractional value renders a distinct half-star at the boundary', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 3.5, max: 5 })} theme={theme} dispatch={jest.fn()} />);
    const glyphs = starGlyphs('r1');
    // star 2 (3rd) is a full filled star, star 3 (4th, the boundary) is the half star — distinct from both
    // the filled stars before it and the outline stars after it.
    expect(glyphs[3]).not.toBe(glyphs[2]);
    expect(glyphs[3]).not.toBe(glyphs[4]);
  });

  test('a full value (equal to max) fills every star', async () => {
    await render(<rating.Component id="r1" props={rating.propsSchema.parse({ value: 5, max: 5 })} theme={theme} dispatch={jest.fn()} />);
    const glyphs = starGlyphs('r1');
    expect(new Set(glyphs).size).toBe(1);
  });

  test('merges the resolved node style onto the container', async () => {
    await render(
      <rating.Component id="r1" props={rating.propsSchema.parse({ value: 4 })} theme={theme} style={{ margin: 4 }} dispatch={jest.fn()} />
    );
    expect(StyleSheet.flatten(screen.getByTestId('r1').props.style)).toMatchObject({ margin: 4 });
  });
});
