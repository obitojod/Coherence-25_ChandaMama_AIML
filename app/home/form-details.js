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
  const [sortBy, setSortBy] = useState("final_score"); // Default sort by final score
  const [hrRequirements, setHrRequirements] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  useEffect(() => {
    fetchFormDetails();
    fetchSubmissions();
  }, [sortBy]); // Refetch when sort changes

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
      const response = await fetch(
        `${API_URL}/api/submissions/${id}?sortBy=${sortBy}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": userToken,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSubmissions(data.submissions || []);
        if (data.form && data.form.hrRequirements) {
          setHrRequirements(data.form.hrRequirements);
        }
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
    const hasAiScore = item.aiEvaluation && item.aiEvaluation.final_score;

    // Find the candidate's name from responses
    const nameResponse = item.responses.find((resp) =>
      getFieldLabel(resp.fieldId).toLowerCase().includes("name")
    );
    const candidateName = nameResponse
      ? nameResponse.value
      : `Candidate ${index + 1}`;

    // Find the candidate's email from responses
    const emailResponse = item.responses.find((resp) =>
      getFieldLabel(resp.fieldId).toLowerCase().includes("email")
    );
    const candidateEmail = emailResponse ? emailResponse.value : "";

    // Find the candidate's phone from responses
    const phoneResponse = item.responses.find((resp) =>
      getFieldLabel(resp.fieldId).toLowerCase().includes("phone")
    );
    const candidatePhone = phoneResponse ? phoneResponse.value : "";

    return (
      <View style={styles.submissionCard}>
        {hasAiScore && (
          <View style={styles.scoreSection}>
            <Text style={styles.finalScoreText}>
              Score: {item.aiEvaluation.final_score}/100
            </Text>

            <View style={styles.scoreBreakdown}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Skills</Text>
                <Text style={styles.scoreValue}>
                  {item.aiEvaluation.breakdown.skills_score}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Exp</Text>
                <Text style={styles.scoreValue}>
                  {item.aiEvaluation.breakdown.experience_score}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Edu</Text>
                <Text style={styles.scoreValue}>
                  {item.aiEvaluation.breakdown.education_score}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Notice</Text>
                <Text style={styles.scoreValue}>
                  {item.aiEvaluation.breakdown.notice_period_score}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.candidateInfo}>
          <View style={styles.candidateDetails}>
            <Text style={styles.candidateName}>{candidateName}</Text>
            {candidateEmail && (
              <Text style={styles.candidateContact}>{candidateEmail}</Text>
            )}
            {candidatePhone && (
              <Text style={styles.candidateContact}>{candidatePhone}</Text>
            )}
            <Text style={styles.submissionDate}>
              Applied: {new Date(item.submittedAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {item.resumeUrl ? (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => openResumeLink(item.resumeUrl)}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text style={styles.resumeButtonText}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noResumeText}>No resume</Text>
            )}

            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() =>
                setExpandedSubmission(
                  expandedSubmission === item._id ? null : item._id
                )
              }
            >
              <Ionicons
                name={
                  expandedSubmission === item._id
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={20}
                color="#4a6da7"
              />
            </TouchableOpacity>
          </View>
        </View>

        {expandedSubmission === item._id && (
          <View style={styles.expandedDetails}>
            <Text style={styles.expandedTitle}>Detailed Responses</Text>
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

            {hasAiScore && (
              <View style={styles.aiAnalysis}>
                <Text style={styles.aiAnalysisTitle}>AI Analysis</Text>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Skills:</Text>
                  <Text style={styles.analysisText}>
                    {item.aiEvaluation.detailed_reasoning.skills_analysis}
                  </Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Experience:</Text>
                  <Text style={styles.analysisText}>
                    {item.aiEvaluation.detailed_reasoning.experience_analysis}
                  </Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Education:</Text>
                  <Text style={styles.analysisText}>
                    {item.aiEvaluation.detailed_reasoning.education_analysis}
                  </Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Notice Period:</Text>
                  <Text style={styles.analysisText}>
                    {
                      item.aiEvaluation.detailed_reasoning
                        .notice_period_analysis
                    }
                  </Text>
                </View>
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Overall:</Text>
                  <Text style={styles.analysisText}>
                    {item.aiEvaluation.detailed_reasoning.overall_analysis}
                  </Text>
                </View>
              </View>
            )}
          </View>
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
        <View style={styles.submissionsHeader}>
          <Text style={styles.sectionTitle}>Candidate Submissions</Text>

          {hrRequirements && (
            <View style={styles.sortingControls}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "final_score" && styles.activeSortButton,
                ]}
                onPress={() => setSortBy("final_score")}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === "final_score" && styles.activeSortButtonText,
                  ]}
                >
                  Overall
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "skills_score" && styles.activeSortButton,
                ]}
                onPress={() => setSortBy("skills_score")}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === "skills_score" && styles.activeSortButtonText,
                  ]}
                >
                  Skills
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "experience_score" && styles.activeSortButton,
                ]}
                onPress={() => setSortBy("experience_score")}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === "experience_score" &&
                      styles.activeSortButtonText,
                  ]}
                >
                  Experience
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "education_score" && styles.activeSortButton,
                ]}
                onPress={() => setSortBy("education_score")}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === "education_score" && styles.activeSortButtonText,
                  ]}
                >
                  Education
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === "date" && styles.activeSortButton,
                ]}
                onPress={() => setSortBy("date")}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === "date" && styles.activeSortButtonText,
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
  scoreSection: {
    marginBottom: 16,
  },
  finalScoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4a6da7",
    marginBottom: 8,
  },
  scoreBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a6da7",
  },
  candidateInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  candidateDetails: {
    flex: 1,
  },
  candidateName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  candidateContact: {
    fontSize: 14,
    color: "#777",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsButton: {
    padding: 4,
  },
  expandedDetails: {
    marginTop: 16,
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  aiAnalysis: {
    marginTop: 16,
  },
  aiAnalysisTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  analysisItem: {
    marginBottom: 8,
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#777",
    marginBottom: 4,
  },
  analysisText: {
    fontSize: 16,
    color: "#333",
  },
  submissionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sortingControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#777",
    marginRight: 8,
  },
  sortButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 6,
  },
  activeSortButton: {
    borderColor: "#4a6da7",
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4a6da7",
  },
  activeSortButtonText: {
    color: "#ffffff",
    backgroundColor: "#4a6da7",
  },
});
