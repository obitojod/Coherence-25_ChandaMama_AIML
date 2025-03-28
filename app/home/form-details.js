import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Share,
  Alert,
  Linking,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../api/config";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

export default function FormDetails() {
  const { userToken } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  useEffect(() => {
    fetchFormDetails();
    fetchSubmissions();
  }, []);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/forms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": userToken,
        },
      });

      const data = await response.json();
      if (response.ok) {
        const foundForm = data.forms.find((form) => form._id === id);
        if (foundForm) {
          setForm(foundForm);
        } else {
          Alert.alert("Error", "Form not found");
          router.back();
        }
      } else {
        Alert.alert("Error", data.message || "Failed to fetch form details");
      }
    } catch (error) {
      console.error("Error fetching form details:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const response = await fetch(`${API_URL}/api/submissions/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": userToken,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setSubmissions(data.submissions || []);
      } else {
        console.error("Failed to fetch submissions:", data.message);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const shareFormLink = async () => {
    try {
      const publicLink = `${API_URL}${form.publicLink}`;

      // Copy to clipboard
      await Clipboard.setStringAsync(publicLink);

      // Share dialog
      await Share.share({
        message: `Apply for our job position by filling out this form: ${publicLink}`,
        url: publicLink,
        title: form.title,
      });

      Alert.alert("Success", "Form link copied to clipboard and shared");
    } catch (error) {
      console.error("Error sharing form link:", error);
      Alert.alert("Error", "Failed to share form link");
    }
  };

  const openResumeLink = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error("Error opening URL:", err);
        Alert.alert("Error", "Could not open resume link");
      });
    } else {
      Alert.alert("Info", "No resume attached to this submission");
    }
  };

  // Helper function to find field label by ID
  const getFieldLabel = (fieldId) => {
    if (!form) return "";
    const field = form.fields.find((f) => f.id === fieldId);
    return field ? field.label : "Unknown Field";
  };

  // Render a candidate submission item
  const renderSubmissionItem = ({ item, index }) => {
    return (
      <View style={styles.submissionCard}>
        <View style={styles.submissionHeader}>
          <Text style={styles.submissionTitle}>Submission #{index + 1}</Text>
          <Text style={styles.submissionDate}>
            {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.responsesList}>
          {item.responses.map((response, idx) => (
            <View key={idx} style={styles.responseItem}>
              <Text style={styles.responseLabel}>
                {getFieldLabel(response.fieldId)}:
              </Text>
              <Text style={styles.responseValue}>{response.value}</Text>
            </View>
          ))}
        </View>

        {item.resumeUrl ? (
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => openResumeLink(item.resumeUrl)}
          >
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.resumeButtonText}>View Resume</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noResumeText}>No resume attached</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Loading form details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Form Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formDetailsContainer}>
        <View style={styles.formHeader}>
          <View>
            <Text style={styles.formTitle}>{form.title}</Text>
            <Text style={styles.formDate}>
              Created on {new Date(form.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={shareFormLink}>
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {form.description && (
          <Text style={styles.formDescription}>{form.description}</Text>
        )}

        <View style={styles.formStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{form.fields.length}</Text>
            <Text style={styles.statLabel}>Fields</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{submissions.length}</Text>
            <Text style={styles.statLabel}>Submissions</Text>
          </View>
        </View>
      </View>

      <View style={styles.submissionsContainer}>
        <Text style={styles.sectionTitle}>Candidate Submissions</Text>

        {loadingSubmissions ? (
          <ActivityIndicator
            size="large"
            color="#4a6da7"
            style={styles.submissionsLoader}
          />
        ) : submissions.length === 0 ? (
          <View style={styles.emptySubmissions}>
            <Ionicons name="document-text-outline" size={64} color="#c5c5c5" />
            <Text style={styles.emptySubmissionsText}>No submissions yet</Text>
            <Text style={styles.emptySubmissionsSubtext}>
              Share the form link with candidates to receive applications
            </Text>
            <TouchableOpacity
              style={styles.shareEmptyButton}
              onPress={shareFormLink}
            >
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.shareEmptyButtonText}>Share Form Link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={submissions}
            keyExtractor={(item) => item._id}
            renderItem={renderSubmissionItem}
            contentContainerStyle={styles.submissionsList}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#555",
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  backButton: {
    padding: 4,
  },
  formDetailsContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  formDate: {
    fontSize: 14,
    color: "#777",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a6da7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  shareButtonText: {
    color: "#ffffff",
    marginLeft: 4,
    fontWeight: "bold",
  },
  formDescription: {
    fontSize: 16,
    color: "#555",
    marginTop: 16,
    marginBottom: 16,
  },
  formStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4a6da7",
  },
  statLabel: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e1e1e1",
  },
  submissionsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  submissionsLoader: {
    marginTop: 40,
  },
  emptySubmissions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptySubmissionsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptySubmissionsSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  shareEmptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a6da7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  shareEmptyButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  submissionsList: {
    paddingBottom: 20,
  },
  submissionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a6da7",
  },
  submissionDate: {
    fontSize: 14,
    color: "#777",
  },
  responsesList: {
    marginBottom: 16,
  },
  responseItem: {
    marginBottom: 10,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 4,
  },
  responseValue: {
    fontSize: 16,
    color: "#333",
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4a6da7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
  },
  resumeButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  noResumeText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
});
