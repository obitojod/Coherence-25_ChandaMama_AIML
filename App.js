import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {/* App routes will be injected by Expo Router */}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
