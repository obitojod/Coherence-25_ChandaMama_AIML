import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../api/config";

// Create the Auth Context
const AuthContext = createContext(null);

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is logged in on app start
  useEffect(() => {
    // Load token and user info from storage
    const loadStoredData = async () => {
      try {
        setIsLoading(true);
        const storedToken = await AsyncStorage.getItem("userToken");
        const storedUserInfo = await AsyncStorage.getItem("userInfo");

        if (storedToken && storedUserInfo) {
          setUserToken(storedToken);
          setUserInfo(JSON.parse(storedUserInfo));
        }
      } catch (error) {
        console.error("Error loading stored auth data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);

      // Call the backend API
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Login failed",
        };
      }

      // Save authentication data
      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));

      setUserInfo(data.user);
      setUserToken(data.token);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "An error occurred during login",
      };
    } finally {
      setIsLoading(false);
    }
  };
  // Add to AuthProvider component
  const requestOTP = async (email) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/generate-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      setIsLoading(false);

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to send OTP",
        };
      }

      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      setIsLoading(false);
      console.error("OTP request error:", error);
      return {
        success: false,
        message: "An error occurred while sending OTP",
      };
    }
  };

  const verifyOTP = async (email, otp, userData = null) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, userData }),
      });

      const data = await response.json();

      setIsLoading(false);

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "OTP verification failed",
        };
      }

      return { success: true, message: data.message };
    } catch (error) {
      setIsLoading(false);
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: "An error occurred during OTP verification",
      };
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Registration failed",
        };
      }

      // Explicitly return the email to help with navigation
      return {
        success: true,
        message: "OTP sent to your email for verification",
        email: userData.email,
        userData: JSON.stringify(userData),
      };
    } catch (error) {
      setIsLoading(false);
      console.error("Registration error:", error);
      return {
        success: false,
        message: "An error occurred during registration",
      };
    }
  };
  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      // Clear stored data
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userInfo");
      // Reset state
      setUserToken(null);
      setUserInfo(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add these functions to authContextValue
  const authContextValue = {
    isLoading,
    userInfo,
    userToken,
    login,
    logout,
    register,
    requestOTP,
    verifyOTP,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
