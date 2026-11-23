/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#087E83';
const tintColorDark = '#5CD6CF';

export const Colors = {
  light: {
    text: '#14232B',
    background: '#F5F8FA',
    tint: tintColorLight,
    icon: '#657680',
    tabIconDefault: '#657680',
    tabIconSelected: tintColorLight,
    surface: '#FFFFFF',
    surfaceMuted: '#EAF2F3',
    border: '#DCE6E8',
    accent: '#F2B84B',
  },
  dark: {
    text: '#F2F7F8',
    background: '#101B22',
    tint: tintColorDark,
    icon: '#A7B7BD',
    tabIconDefault: '#A7B7BD',
    tabIconSelected: tintColorDark,
    surface: '#17262E',
    surfaceMuted: '#20343D',
    border: '#2D424B',
    accent: '#F2B84B',
  },
};
