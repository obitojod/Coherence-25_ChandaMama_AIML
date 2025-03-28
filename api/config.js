import { Platform } from "react-native";

// Define the base API URL based on environment
let API_URL;

if (__DEV__) {
  // Development environment
  if (Platform.OS === "android") {
    // 10.0.2.2 is the special IP that Android emulators use to connect to the host machine
    API_URL = "http://10.0.2.2:3001";
  } else if (Platform.OS === "ios") {
    // For iOS simulators, localhost works
    API_URL = "http://localhost:3001";
  } else {
    // For physical devices, use your computer's IP address on your local network
    API_URL = "http://192.168.10.30:3001"; // Your actual IP address
  }
} else {
  // Production environment
  API_URL = "https://hr-recruitment-api.example.com"; // Update with your production API URL when deployed
}

// Gemini API configuration (if needed client-side)
const GEMINI_MODEL = "gemini-1.5-flash";

export { API_URL, GEMINI_MODEL };
