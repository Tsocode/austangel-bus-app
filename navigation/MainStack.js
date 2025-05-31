

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverScreen from '../app/(tabs)/driver';
import LoginScreen from '../app/(tabs)/login';
import SignupScreen from '../app/(tabs)/signup';
import TrackScreen from '../app/(tabs)/track';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Driver" component={DriverScreen} />
      <Stack.Screen name="Track" component={TrackScreen} />
    </Stack.Navigator>
  );
}