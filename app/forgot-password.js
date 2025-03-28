import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import CustomAlert from "../components/CustomAlert";
import { API_URL } from "../api/config";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!email) {
      showCustomAlert("Please enter your email");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showCustomAlert(
          data.message || "Password reset email sent successfully!"
        );
        // Only redirect after successful response and user closes the alert
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        showCustomAlert(
          data.message || "Failed to send reset email. Please try again."
        );
      }
    } catch (error) {
      console.error("Reset Password Error:", error);
      showCustomAlert(
        "Failed to send reset email. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        visible={showAlert}
        message={alertMessage}
        onClose={() => setShowAlert(false)}
      />

      <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
        <Ionicons name="arrow-back" size={24} color="#6a42bd" />
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email to receive a Pyaaz Chat password reset link.
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#6a42bd"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={isLoading}
        >
          <View style={[styles.buttonGradient, { backgroundColor: "#f5f5f5" }]}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#6a42bd" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={handleBackToLogin}
        >
          <Text style={styles.backToLoginText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  backButton: {
    padding: 16,
  },
  formContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#6a42bd",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 32,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f0ff",
    borderRadius: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
    width: "100%",
    maxWidth: 400,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333333",
  },
  button: {
    width: "100%",
    maxWidth: 400,
    height: 50,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#6a42bd",
    fontSize: 16,
    fontWeight: "bold",
  },
  backToLoginButton: {
    marginTop: 16,
  },
  backToLoginText: {
    color: "#6a42bd",
    fontSize: 16,
  },
});
