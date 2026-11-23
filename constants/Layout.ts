import { Platform } from 'react-native';

/** Shared spacing and content-width rules for mobile and resizable web windows. */
export const Layout = {
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const,
  radius: { control: 12, card: 18, panel: 24, pill: 999 } as const,
  pageGutter: 20,
  readableWidth: 720,
  pageWidth: 1200,
  desktopBreakpoint: 840,
} as const;

export const minimumTouchTarget = Platform.select({
  ios: 44,
  android: 48,
  default: 44,
})!;
