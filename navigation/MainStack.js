

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverScreen from '../app/driver';
import LoginScreen from '../app/login';
import SignupScreen from '../app/signup';
import TrackScreen from '../app/track';

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