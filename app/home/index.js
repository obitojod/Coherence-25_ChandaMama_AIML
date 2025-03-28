import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../api/config";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Dashboard() {
  const { userToken, userInfo, logout } = useAuth();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      console.log(
        "Fetching forms with token:",
        userToken ? "Token exists" : "No token"
      );

      if (!userToken) {
        console.error("No auth token available");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/forms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": userToken,
        },
      });

      const data = await response.json();
      console.log("Forms API response status:", response.status);

      if (response.status === 401) {
        console.error("Authentication error: Token invalid or expired");
        Alert.alert(
          "Authentication Error",
          "Your session has expired. Please log in again.",
          [{ text: "OK", onPress: () => logout() }]
        );
        return;
      }

      if (response.ok) {
        console.log(`Successfully fetched ${data.forms?.length || 0} forms`);
        setForms(data.forms || []);
      } else {
        console.error("Failed to fetch forms:", data.message);
        Alert.alert("Error", data.message || "Failed to load forms");
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
      Alert.alert("Error", "An unexpected error occurred while loading forms");
    } finally {
      setLoading(false);
    }
  };

  const navigateToCreateForm = () => {
    router.push("/home/create-form");
  };

  const navigateToFormDetails = (formId) => {
    router.push(`/home/form-details?id=${formId}`);
  };

  const renderFormItem = ({ item }) => (
    <TouchableOpacity
      style={styles.formCard}
      onPress={() => navigateToFormDetails(item._id)}
    >
      <View style={styles.formCardHeader}>
        <Text style={styles.formTitle}>{item.title}</Text>
        <Text style={styles.formDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.formDescription} numberOfLines={2}>
        {item.description || "No description provided"}
      </Text>
      <View style={styles.formCardFooter}>
        <Text style={styles.fieldCount}>{item.fields?.length || 0} fields</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            // Copy to clipboard or share functionality
            alert(`Public link: ${API_URL}${item.publicLink}`);
          }}
        >
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.shareButtonText}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HR Recruitment Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          Welcome, {userInfo?.name || "User"}!
        </Text>
        <Text style={styles.welcomeDescription}>
          Create and manage recruitment forms for candidates
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Recruitment Forms</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={navigateToCreateForm}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Form</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#4a6da7"
            style={styles.loader}
          />
        ) : forms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#c5c5c5" />
            <Text style={styles.emptyStateText}>No forms created yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first recruitment form to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={navigateToCreateForm}
            >
              <Text style={styles.emptyStateButtonText}>Create Form</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={forms}
            keyExtractor={(item) => item._id}
            renderItem={renderFormItem}
            contentContainerStyle={styles.formsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    padding: 8,
  },
  welcomeSection: {
    backgroundColor: "#4a6da7",
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  welcomeDescription: {
    fontSize: 16,
    color: "#e0e0e0",
    marginTop: 8,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a6da7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#ffffff",
    marginLeft: 4,
    fontWeight: "bold",
  },
  formsList: {
    paddingBottom: 20,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  formDate: {
    fontSize: 14,
    color: "#888",
  },
  formDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  formCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  fieldCount: {
    fontSize: 14,
    color: "#666",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a6da7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareButtonText: {
    color: "#ffffff",
    marginLeft: 4,
    fontSize: 14,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#4a6da7",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
