import { describe, expect, it } from 'vitest';
import { enterprisePalette, enterpriseThemes } from '../tokens';

function luminance(hex: string) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('enterprise design tokens', () => {
  it('uses the approved Teachmo enterprise palette', () => {
    expect(enterprisePalette).toMatchObject({
      offWhite: '#FAFAFA',
      slate: '#2F3437',
      teachmoBlue: '#2451FF',
      leafGreen: '#2DBF6E',
      sunriseGold: '#FFC857',
      coral: '#FF6B6B'
    });
  });

  it('keeps foreground/background contrast at WCAG AA or better', () => {
    expect(contrastRatio(enterpriseThemes.light.foreground, enterpriseThemes.light.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(enterpriseThemes.dark.foreground, enterpriseThemes.dark.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(enterpriseThemes.highContrast.foreground, enterpriseThemes.highContrast.background)).toBeGreaterThanOrEqual(7);
  });
});
