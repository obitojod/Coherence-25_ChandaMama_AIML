import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import CustomAlert from "../components/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../api/config";

export default function ResetPassword() {
  const params = useLocalSearchParams();
  const [token, setToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState(false);
  const router = useRouter();

  // Wait until the token is extracted before deciding to redirect
  useEffect(() => {
    const extractedToken = params?.token || "";
    setToken(extractedToken);
    setCheckingToken(false);

    console.log("Extracted token:", extractedToken);

    if (!extractedToken) {
      console.log("No token found in URL");
    }
  }, [params]);

  const handleReset = async () => {
    if (!newPassword) {
      showCustomAlert("Please enter a new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      showCustomAlert("Passwords do not match");
      return;
    }

    if (!token) {
      showCustomAlert("Missing reset token");
      return;
    }

    setLoading(true);

    try {
      console.log("Sending token to API:", token);
      const response = await fetch(`${API_URL}/api/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      // Show success message and set a flag to redirect after alert is closed
      setSuccessRedirect(true);
      showCustomAlert("Password updated successfully!");
    } catch (error) {
      console.error("Reset error:", error);
      showCustomAlert("Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  // Handle alert close with potential redirect
  const handleAlertClose = () => {
    setShowAlert(false);

    // If password was successfully reset, redirect to login
    if (successRedirect) {
      setTimeout(() => {
        router.replace("/login");
      }, 100);
    }
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  // Show loading indicator while checking token
  if (checkingToken) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4a6da7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        visible={showAlert}
        message={alertMessage}
        onClose={handleAlertClose}
      />

      <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
        <Ionicons name="arrow-back" size={24} color="#4a6da7" />
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password below</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#4a6da7" />
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#4a6da7"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#4a6da7"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleReset}
              disabled={loading}
            >
              <View
                style={[styles.buttonGradient, { backgroundColor: "#6a42bd" }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={handleBackToLogin}
            >
              <Text style={styles.loginLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#4a6da7",
    marginBottom: 10,
    fontFamily: "Montserrat_Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
    fontFamily: "Montserrat_Regular",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    width: "100%",
    marginBottom: 20,
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontFamily: "Montserrat_Regular",
  },
  button: {
    width: "100%",
    marginBottom: 20,
  },
  buttonGradient: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Montserrat_Bold",
  },
  loginLink: {
    marginTop: 20,
  },
  loginLinkText: {
    color: "#4a6da7",
    fontSize: 16,
    fontFamily: "Montserrat_Regular",
    textDecorationLine: "underline",
  },
});
