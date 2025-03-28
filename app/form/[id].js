import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { API_URL } from "../../api/config";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import CheckBox from "@react-native-community/checkbox";

export default function PublicForm() {
  const { id } = useLocalSearchParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState({});
  const [resumeFile, setResumeFile] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState(null);

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/forms/public/${id}`);
      const data = await response.json();

      if (response.ok) {
        setForm(data.form);

        // Initialize responses object
        const initialResponses = {};
        data.form.fields.forEach((field) => {
          if (field.type === "checkbox") {
            initialResponses[field.id] = false;
          } else {
            initialResponses[field.id] = "";
          }
        });
        setResponses(initialResponses);
      } else {
        Alert.alert("Error", "Form not found");
      }
    } catch (error) {
      console.error("Error fetching form:", error);
      Alert.alert("Error", "Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (fieldId, value) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && dateField) {
      setResponses((prev) => ({
        ...prev,
        [dateField]: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  const showDatepickerForField = (fieldId) => {
    setDateField(fieldId);
    setShowDatePicker(true);
  };

  const pickResume = async () => {
    try {
      console.log("Opening document picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      console.log("Document picker result:", JSON.stringify(result));

      if (
        result.canceled === false &&
        result.assets &&
        result.assets.length > 0
      ) {
        const file = result.assets[0];
        console.log("Selected file:", file.name);
        console.log("File URI:", file.uri);
        console.log("File type:", file.mimeType);
        console.log("File size:", file.size);

        // Ensure file has all required properties
        const completeFile = {
          ...file,
          // Ensure mimeType exists (fallback if not provided)
          mimeType:
            file.mimeType ||
            file.type ||
            (file.name.endsWith(".pdf")
              ? "application/pdf"
              : file.name.endsWith(".doc")
              ? "application/msword"
              : file.name.endsWith(".docx")
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "application/octet-stream"),
        };

        setResumeFile(completeFile);
        Alert.alert("Success", `File "${file.name}" selected successfully`);
      } else {
        console.log("Document picking canceled or failed");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const validateForm = () => {
    for (const field of form.fields) {
      if (field.required) {
        if (field.type === "file") {
          if (!resumeFile) {
            Alert.alert("Error", `Please upload your ${field.label}`);
            return false;
          }
        } else if (!responses[field.id]) {
          Alert.alert("Error", `Please fill in ${field.label}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      console.log(
        "Starting form submission with file:",
        resumeFile ? resumeFile.name : "none"
      );

      // Format responses for API
      const formattedResponses = Object.keys(responses).map((fieldId) => {
        return {
          fieldId,
          value: String(responses[fieldId]),
        };
      });

      // Create form data for multipart/form-data submission
      const formData = new FormData();

      // Add responses as JSON string
      formData.append("responses", JSON.stringify(formattedResponses));

      // Add resume file if present - USING MODIFIED APPROACH
      if (resumeFile) {
        try {
          // Make sure we have all the required file information
          console.log("Attaching file to request:", resumeFile.name);

          // For web, when running in Chrome simulator
          if (Platform.OS === "web") {
            // In web, we need to get the actual file from the URI
            // For a fully working web version, you'd need file input element
            // This is a simplified version for testing
            console.log(
              "Web platform detected, handling file upload differently"
            );

            const response = await fetch(resumeFile.uri);
            const blob = await response.blob();
            formData.append("resume", blob, resumeFile.name);
          } else {
            // For React Native (iOS/Android)
            // Create the file object with explicit parameters
            const fileToUpload = {
              uri: resumeFile.uri,
              type: resumeFile.mimeType || "application/octet-stream",
              name: resumeFile.name || "resume.pdf",
            };
            console.log("File details:", JSON.stringify(fileToUpload));

            // Ensure we're using the correct format for React Native
            formData.append("resume", fileToUpload);
          }

          console.log("File appended to FormData");

          // Verify formData contents
          if (formData._parts) {
            for (let i = 0; i < formData._parts.length; i++) {
              console.log(
                `FormData part ${i}: key=${formData._parts[i][0]}, value=`,
                typeof formData._parts[i][1] === "object"
                  ? "File Object"
                  : formData._parts[i][1]
              );
            }
          }
        } catch (fileError) {
          console.error("Error preparing file:", fileError);
          console.error(fileError.stack);
        }
      }

      console.log("Sending form data to server...");

      try {
        // Send the request without manually setting Content-Type
        const response = await fetch(`${API_URL}/api/submit/${form._id}`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log("Submission response:", data);

        if (response.ok) {
          Alert.alert(
            "Success",
            "Your application has been submitted successfully!",
            [
              {
                text: "OK",
                onPress: () => {
                  // Reset form
                  const initialResponses = {};
                  form.fields.forEach((field) => {
                    if (field.type === "checkbox") {
                      initialResponses[field.id] = false;
                    } else {
                      initialResponses[field.id] = "";
                    }
                  });
                  setResponses(initialResponses);
                  setResumeFile(null);
                },
              },
            ]
          );
        } else {
          Alert.alert("Error", data.message || "Failed to submit form");
        }
      } catch (error) {
        console.error("Form submission error:", error);
        Alert.alert("Error", "An unexpected error occurred");
      } finally {
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const renderField = (field) => {
    switch (field.type) {
      case "text":
      case "email":
      case "tel":
      case "number":
        return (
          <TextInput
            style={styles.textInput}
            value={responses[field.id]}
            onChangeText={(text) => handleResponseChange(field.id, text)}
            placeholder={`Enter ${field.label}`}
            keyboardType={
              field.type === "email"
                ? "email-address"
                : field.type === "tel"
                ? "phone-pad"
                : field.type === "number"
                ? "numeric"
                : "default"
            }
          />
        );

      case "textarea":
        return (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={responses[field.id]}
            onChangeText={(text) => handleResponseChange(field.id, text)}
            placeholder={`Enter ${field.label}`}
            multiline
            numberOfLines={4}
          />
        );

      case "select":
        return (
          <View style={styles.selectContainer}>
            {field.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.selectOption,
                  responses[field.id] === option
                    ? styles.selectOptionSelected
                    : null,
                ]}
                onPress={() => handleResponseChange(field.id, option)}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    responses[field.id] === option
                      ? styles.selectOptionTextSelected
                      : null,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "radio":
        return (
          <View style={styles.radioContainer}>
            {field.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.radioOption}
                onPress={() => handleResponseChange(field.id, option)}
              >
                <View style={styles.radioButton}>
                  {responses[field.id] === option && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Text style={styles.radioOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "checkbox":
        return (
          <View style={styles.checkboxContainer}>
            <CheckBox
              value={responses[field.id]}
              onValueChange={(newValue) =>
                handleResponseChange(field.id, newValue)
              }
              tintColors={{ true: "#4a6da7", false: "#777" }}
            />
            <Text style={styles.checkboxLabel}>{field.label}</Text>
          </View>
        );

      case "date":
        return (
          <View>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => showDatepickerForField(field.id)}
            >
              <Text style={styles.datePickerButtonText}>
                {responses[field.id] || `Select ${field.label}`}
              </Text>
              <Ionicons name="calendar" size={20} color="#4a6da7" />
            </TouchableOpacity>

            {showDatePicker && dateField === field.id && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>
        );

      case "file":
        return (
          <View style={styles.fileContainer}>
            <TouchableOpacity
              style={styles.filePickerButton}
              onPress={pickResume}
            >
              <Ionicons name="document-attach" size={24} color="#4a6da7" />
              <Text style={styles.filePickerButtonText}>
                {resumeFile ? "Change File" : `Upload ${field.label}`}
              </Text>
            </TouchableOpacity>

            {resumeFile && (
              <View style={styles.filePreview}>
                <View style={styles.fileInfo}>
                  <Ionicons name="document" size={24} color="#4a6da7" />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {resumeFile.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {Math.round(resumeFile.size / 1024)} KB
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.fileRemoveButton}
                  onPress={() => setResumeFile(null)}
                >
                  <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return (
          <TextInput
            style={styles.textInput}
            value={responses[field.id]}
            onChangeText={(text) => handleResponseChange(field.id, text)}
            placeholder={`Enter ${field.label}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Form Not Found</Text>
        <Text style={styles.errorMessage}>
          The form you are looking for is not available.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Application Form</Text>
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>{form.title}</Text>
          {form.description && (
            <Text style={styles.formDescription}>{form.description}</Text>
          )}
        </View>

        {form.fields.map((field) => (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.requiredStar}>*</Text>}
            </Text>
            {renderField(field)}
          </View>
        ))}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  header: {
    backgroundColor: "#4a6da7",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 16,
    color: "#666",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#ff6b6b",
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: "#555",
  },
  selectContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  selectOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectOptionSelected: {
    backgroundColor: "#e8f0fe",
  },
  selectOptionText: {
    fontSize: 16,
    color: "#555",
  },
  selectOptionTextSelected: {
    color: "#4a6da7",
    fontWeight: "bold",
  },
  radioContainer: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4a6da7",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4a6da7",
  },
  radioOptionText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  fileContainer: {
    marginVertical: 8,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
  },
  filePickerButtonText: {
    fontSize: 16,
    color: "#4a6da7",
    marginLeft: 10,
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f0fe",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fileDetails: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontWeight: "bold",
    color: "#333",
  },
  fileSize: {
    fontSize: 12,
    color: "#666",
  },
  fileRemoveButton: {
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: "#4a6da7",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
