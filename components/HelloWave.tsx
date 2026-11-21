import { useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { ThemedText } from "@/components/ThemedText";

export function HelloWave() {
  // On web, just render the wave emoji without animation
  if (Platform.OS === "web") {
    return <ThemedText style={styles.text}>👋</ThemedText>;
  }

  // On native (iOS/Android), use Reanimated for animations
  const Animated = require("react-native-reanimated").default;
  const { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } = require("react-native-reanimated");

  const rotationAnimation = useSharedValue(0);

  useEffect(() => {
    rotationAnimation.value = withRepeat(
      withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
      4 // Run the animation 4 times
    );
  }, [rotationAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAnimation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
