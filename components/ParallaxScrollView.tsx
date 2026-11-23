import type { PropsWithChildren, ReactElement } from "react";
import { StyleSheet, Platform, ScrollView } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { useColorScheme } from "@/hooks/useColorScheme";

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const colorScheme = useColorScheme() ?? "light";
  const bottom = useBottomTabOverflow();

  // On web, use a simple ScrollView without animations
  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          scrollEventThrottle={16}
          scrollIndicatorInsets={{ bottom }}
          contentContainerStyle={{ paddingBottom: bottom }}>
          <ThemedView
            style={[
              styles.header,
              {
                backgroundColor: headerBackgroundColor[colorScheme ?? "light"],
              },
            ]}>
            {headerImage}
          </ThemedView>
          <ThemedView style={styles.content}>{children}</ThemedView>
        </ScrollView>
      </ThemedView>
    );
  }

  // On native (iOS/Android), use Reanimated for smooth parallax animations
  const Animated = require("react-native-reanimated").default;
  const { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset } = require("react-native-reanimated");

  const scrollRef = useAnimatedRef();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}>
        <Animated.View
          style={[
            styles.header,
            headerAnimatedStyle,
            {
              backgroundColor: headerBackgroundColor[colorScheme],
            },
          ]}>
          {headerImage}
        </Animated.View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: "hidden",
  },
});
