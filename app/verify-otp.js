import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "../context/AuthContext";
import CustomAlert from "../components/CustomAlert";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const { verifyOTP, requestOTP, isLoading } = useAuth();

  // Get email and userData from params
  const email = params.email;
  const userData = params.userData ? JSON.parse(params.userData) : null;

  // Set screen orientation to landscape
  useEffect(() => {
    async function setOrientation() {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    }
    setOrientation();

    // Return if no email
    if (!email) {
      router.replace("/register");
      return;
    }

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      showCustomAlert("Please enter a valid 6-digit OTP");
      return;
    }

    const result = await verifyOTP(email, otp, userData);

    if (result.success) {
      showCustomAlert("Email verified successfully!");
      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    } else {
      showCustomAlert(result.message || "Invalid OTP");
    }
  };

  const handleResendOTP = async () => {
    const result = await requestOTP(email);

    if (result.success) {
      // Reset timer
      setTimeLeft(900); // 15 minutes
      showCustomAlert("OTP sent successfully");
    } else {
      showCustomAlert(result.message || "Failed to send OTP");
    }
  };

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        visible={showAlert}
        message={alertMessage}
        onClose={() => setShowAlert(false)}
      />
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Email Verification</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to your email
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.otpContainer}>
          <Text style={styles.label}>Enter OTP</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(text) => {
              // Only allow numbers and max 6 digits
              if (/^\d*$/.test(text) && text.length <= 6) {
                setOtp(text);
              }
            }}
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Text style={styles.timer}>
            Code expires in: {formatTime(timeLeft)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerifyOTP}
          disabled={isLoading || timeLeft === 0}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={isLoading || timeLeft > 800} // Allow resend after ~1.5 minutes
          >
            <Text
              style={[
                styles.resendLink,
                (isLoading || timeLeft > 800) && styles.disabledText,
              ]}
            >
              Resend OTP
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Back to Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  card: {
    width: "60%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    fontFamily: "Montserrat_Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "Montserrat_Regular",
  },
  email: {
    fontSize: 16,
    color: "#4a6da7",
    fontWeight: "bold",
    fontFamily: "Montserrat_Bold",
  },
  otpContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555",
    fontFamily: "Montserrat_Regular",
  },
  otpInput: {
    backgroundColor: "#f9f9f9",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 18,
    fontFamily: "Montserrat_Regular",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
  },
  timer: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    fontFamily: "Montserrat_Regular",
  },
  button: {
    backgroundColor: "#4a6da7",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#4a6da7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Montserrat_Bold",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  resendText: {
    color: "#555",
    fontSize: 14,
    fontFamily: "Montserrat_Regular",
  },
  resendLink: {
    color: "#4a6da7",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Montserrat_Bold",
  },
  disabledText: {
    color: "#aaa",
  },
  backLink: {
    marginTop: 24,
    alignItems: "center",
  },
  backLinkText: {
    color: "#666",
    fontSize: 14,
    fontFamily: "Montserrat_Regular",
  },
});
