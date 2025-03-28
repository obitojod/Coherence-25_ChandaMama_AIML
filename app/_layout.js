import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuth, AuthProvider } from "../context/AuthContext";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { View, ActivityIndicator, StatusBar } from "react-native";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Montserrat_Regular: Montserrat_400Regular,
    Montserrat_Bold: Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4a6da7" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar hidden={true} />
      <ProtectedStack />
    </AuthProvider>
  );
}

// 🔒 Protect all screens inside the app
function ProtectedStack() {
  const router = useRouter();
  const segments = useSegments();
  const { userToken, isLoading } = useAuth();

  // Allow access to public form and other public routes
  useEffect(() => {
    const authRoutes = [
      "login",
      "reset-password",
      "forgot-password",
      "register",
      "verify-otp",
    ];

    const inAuthGroup = segments.length > 0 && authRoutes.includes(segments[0]);
    const isFormRoute = segments.length > 0 && segments[0] === "form";

    console.log("Current route:", segments[0]);
    console.log("User token exists:", !!userToken);
    console.log("Is loading:", isLoading);

    // Only redirect when not loading
    if (isLoading) return;

    if (!userToken) {
      // If user is not logged in and trying to access a protected route
      if (!inAuthGroup && !isFormRoute && segments[0] !== undefined) {
        console.log("Redirecting to login");
        router.replace("/login");
      }
    } else {
      // If user is logged in and trying to access auth routes
      if (inAuthGroup) {
        console.log("Redirecting to home");
        router.replace("/home/");
      }
    }
  }, [userToken, segments, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Authentication Routes */}
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />

      {/* Dashboard Routes */}
      <Stack.Screen name="home/index" />
      <Stack.Screen name="home/create-form" />
      <Stack.Screen name="home/form-details" />

      {/* Public Form Routes */}
      <Stack.Screen name="form/[id]" />
    </Stack>
  );
}
