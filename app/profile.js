import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../api/config";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import CustomAlert from "../components/CustomAlert";

export default function Profile() {
  const router = useRouter();
  const { userInfo, logout, userToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [chatStats, setChatStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    averageMessagesPerConversation: 0,
    lastActive: null,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    if (!userToken) return;

    setLoading(true);
    try {
      // Fetch conversation data
      const response = await fetch(`${API_URL}/api/conversations`, {
        headers: { "x-auth-token": userToken },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch conversations");
      }

      // Calculate stats
      const conversations = data.conversations || [];
      const totalConversations = conversations.length;

      let totalMessages = 0;
      let lastActiveDate = null;

      conversations.forEach((convo) => {
        totalMessages += convo.messageCount || 0;

        // Track the most recent activity
        const convoDate = new Date(convo.updatedAt);
        if (!lastActiveDate || convoDate > lastActiveDate) {
          lastActiveDate = convoDate;
        }
      });

      setChatStats({
        totalConversations,
        totalMessages,
        averageMessagesPerConversation:
          totalConversations > 0
            ? Math.round(totalMessages / totalConversations)
            : 0,
        lastActive: lastActiveDate,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);

      // Show error in development
      if (__DEV__) {
        Alert.alert("Error", "Failed to load profile data");
      }
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message) => {
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleLogout = async () => {
    showAlert("Are you sure you want to logout?");
  };

  const navigateToHome = () => {
    router.replace("/home");
  };

  const navigateToConversations = () => {
    router.push("/home/conversations");
  };

  const formatDate = (date) => {
    if (!date) return "Never";

    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with gradient background */}
      <View style={[styles.header, { backgroundColor: "#6a42bd" }]}>
        <TouchableOpacity style={styles.backButton} onPress={navigateToHome}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchUserData}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6a42bd" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              <Image
                source={require("../assets/images/profile-icon.png")}
                style={styles.profileImage}
              />
            </View>

            <Text style={styles.name}>{userInfo?.name || "User"}</Text>
            <Text style={styles.email}>
              {userInfo?.email || "email@example.com"}
            </Text>

            {/* User info pills */}
            <View style={styles.userInfoPills}>
              {userInfo?.gender && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{userInfo.gender}</Text>
                </View>
              )}

              {userInfo?.age && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{userInfo.age} years</Text>
                </View>
              )}
            </View>
          </View>

          {/* Chat Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <FontAwesome5
                name="chart-bar"
                size={18}
                color="#6a42bd"
                style={styles.sectionIcon}
              />
              Chat Statistics
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {chatStats.totalConversations}
                </Text>
                <Text style={styles.statLabel}>Conversations</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{chatStats.totalMessages}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {chatStats.averageMessagesPerConversation}
                </Text>
                <Text style={styles.statLabel}>Avg / Conv</Text>
              </View>
            </View>

            <View style={styles.lastActiveContainer}>
              <Ionicons name="time-outline" size={18} color="#6a42bd" />
              <Text style={styles.lastActiveText}>
                Last active:{" "}
                {chatStats.lastActive
                  ? formatDate(chatStats.lastActive)
                  : "Never"}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons
                name="flash"
                size={20}
                color="#6a42bd"
                style={styles.sectionIcon}
              />
              Quick Actions
            </Text>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => router.push("/home/chat")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#6a42bd" },
                  ]}
                >
                  <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>New Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={navigateToConversations}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#5c6bc0" },
                  ]}
                >
                  <MaterialIcons name="history" size={22} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => router.push("/reset-password")}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#26a69a" },
                  ]}
                >
                  <MaterialIcons name="lock" size={22} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleLogout}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: "#ef5350" },
                  ]}
                >
                  <MaterialIcons name="logout" size={22} color="#fff" />
                </View>
                <Text style={styles.quickActionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons
                name="settings-outline"
                size={20}
                color="#6a42bd"
                style={styles.sectionIcon}
              />
              Account Settings
            </Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                showAlert("This feature is coming in a future update.")
              }
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="person-outline" size={22} color="#6a42bd" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingDescription}>
                  Update your personal information
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                showAlert(
                  "Your conversations are stored securely and used to provide better AI responses. You can delete your chat history at any time."
                )
              }
            >
              <View style={styles.settingIconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color="#6a42bd"
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Privacy & Data</Text>
                <Text style={styles.settingDescription}>
                  Manage your data and privacy settings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                showAlert(
                  "Need assistance? Contact us at support@pyaazchat.com"
                )
              }
            >
              <View style={styles.settingIconContainer}>
                <Ionicons
                  name="help-circle-outline"
                  size={22}
                  color="#6a42bd"
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Help & Support</Text>
                <Text style={styles.settingDescription}>
                  Get assistance with the app
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>

          {/* App Information */}
          <View style={styles.appInfoContainer}>
            <Image
              source={require("../assets/images/app-icon.png")}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Pyaaz Chat</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              Your AI conversation assistant powered by Google's Gemini
              technology
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (alertMessage === "Are you sure you want to logout?") {
            logout();
            router.replace("/login");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  refreshButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6a42bd",
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImageContainer: {
    height: 100,
    width: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#6a42bd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    height: 100,
    width: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  userInfoPills: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  pillText: {
    fontSize: 14,
    color: "#666",
  },

  // Sections
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6a42bd",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  lastActiveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  lastActiveText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -4,
  },
  quickActionButton: {
    width: "48%",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  // Settings
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#888",
  },

  // App Info
  appInfoContainer: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
  },
  appIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6a42bd",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    maxWidth: "80%",
  },
});
