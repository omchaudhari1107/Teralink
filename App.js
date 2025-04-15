// App.js
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import PlayScreen from './screens/play';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Play"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#121212',
            // marginTop: 30,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 25,
            // marginTop: 10,
          },
          // texrtAlign: 'center',
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen
          name="Play"
          component={PlayScreen}
            options={{ title: 'TeraLink Video Player' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;