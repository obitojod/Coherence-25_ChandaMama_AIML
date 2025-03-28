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
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { API_URL } from "../../api/config";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export default function CreateForm() {
  const { userToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log(
      "CreateForm - Auth token status:",
      userToken ? "Present" : "Missing"
    );
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fields: [
      {
        id: "1",
        type: "text",
        label: "Full Name",
        required: true,
        options: [],
      },
      {
        id: "2",
        type: "email",
        label: "Email Address",
        required: true,
        options: [],
      },
      {
        id: "3",
        type: "tel",
        label: "Phone Number",
        required: false,
        options: [],
      },
    ],
    hrRequirements: {
      job_id: "",
      role: "",
      experience_required: {
        minimum: 0,
        maximum: 0,
        preferred_industry: "",
      },
      notice_period: {
        required: "",
        preferred: "",
      },
      location: {
        city: "",
        state: "",
        country: "",
        remote_option: "",
      },
      required_skills: [],
      preferred_skills: [],
      qualifications: [],
      job_description: "",
    },
  });

  const addField = () => {
    const newId = (formData.fields.length + 1).toString();
    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        { id: newId, type: "text", label: "", required: false, options: [] },
      ],
    });
  };

  const removeField = (id) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((field) => field.id !== id),
    });
  };

  const updateField = (id, key, value) => {
    setFormData({
      ...formData,
      fields: formData.fields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field
      ),
    });
  };

  const addOption = (fieldId) => {
    setFormData({
      ...formData,
      fields: formData.fields.map((field) => {
        if (field.id === fieldId) {
          const options = [...field.options, ""];
          return { ...field, options };
        }
        return field;
      }),
    });
  };

  const updateOption = (fieldId, index, value) => {
    setFormData({
      ...formData,
      fields: formData.fields.map((field) => {
        if (field.id === fieldId) {
          const options = [...field.options];
          options[index] = value;
          return { ...field, options };
        }
        return field;
      }),
    });
  };

  const removeOption = (fieldId, index) => {
    setFormData({
      ...formData,
      fields: formData.fields.map((field) => {
        if (field.id === fieldId) {
          const options = [...field.options];
          options.splice(index, 1);
          return { ...field, options };
        }
        return field;
      }),
    });
  };

  const updateHrRequirements = (path, value) => {
    const pathArray = path.split(".");
    const newHrRequirements = { ...formData.hrRequirements };

    let current = newHrRequirements;
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }

    current[pathArray[pathArray.length - 1]] = value;

    setFormData({
      ...formData,
      hrRequirements: newHrRequirements,
    });
  };

  const addHrRequirementItem = (arrayPath, value = "") => {
    const pathArray = arrayPath.split(".");
    const newHrRequirements = { ...formData.hrRequirements };

    let current = newHrRequirements;
    for (let i = 0; i < pathArray.length; i++) {
      current = current[pathArray[i]];
    }

    current.push(value);

    setFormData({
      ...formData,
      hrRequirements: newHrRequirements,
    });
  };

  const removeHrRequirementItem = (arrayPath, index) => {
    const pathArray = arrayPath.split(".");
    const newHrRequirements = { ...formData.hrRequirements };

    let current = newHrRequirements;
    for (let i = 0; i < pathArray.length; i++) {
      current = current[pathArray[i]];
    }

    current.splice(index, 1);

    setFormData({
      ...formData,
      hrRequirements: newHrRequirements,
    });
  };

  const updateHrRequirementItem = (arrayPath, index, value) => {
    const pathArray = arrayPath.split(".");
    const newHrRequirements = { ...formData.hrRequirements };

    let current = newHrRequirements;
    for (let i = 0; i < pathArray.length; i++) {
      current = current[pathArray[i]];
    }

    current[index] = value;

    setFormData({
      ...formData,
      hrRequirements: newHrRequirements,
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter a form title");
      return false;
    }

    for (const field of formData.fields) {
      if (!field.label.trim()) {
        Alert.alert("Error", "All fields must have a label");
        return false;
      }

      if (
        (field.type === "select" ||
          field.type === "radio" ||
          field.type === "checkbox") &&
        field.options.length < 1
      ) {
        Alert.alert("Error", `${field.label} needs at least one option`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log("Form data being sent:", JSON.stringify(formData));

      const response = await fetch(`${API_URL}/api/forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": userToken,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Form creation response:", data);

      if (response.ok) {
        Alert.alert("Success", "Form created successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to create form");
      }
    } catch (error) {
      console.error("Form creation error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderFieldOptions = (field) => {
    if (
      field.type === "select" ||
      field.type === "radio" ||
      field.type === "checkbox"
    ) {
      return (
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsLabel}>Options:</Text>
          {field.options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={styles.optionInput}
                value={option}
                onChangeText={(text) => updateOption(field.id, index, text)}
                placeholder="Option text"
              />
              <TouchableOpacity
                style={styles.removeOptionButton}
                onPress={() => removeOption(field.id, index)}
              >
                <Ionicons name="close-circle" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addOptionButton}
            onPress={() => addOption(field.id)}
          >
            <Ionicons name="add-circle" size={20} color="#4a6da7" />
            <Text style={styles.addOptionText}>Add Option</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Recruitment Form</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Form Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Form Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter form title"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Enter form description"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Job Requirements (AI Scoring)</Text>
          <Text style={styles.sectionDescription}>
            Fill out these fields to enable AI resume scoring and ranking
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Job ID</Text>
            <TextInput
              style={styles.textInput}
              value={formData.hrRequirements.job_id}
              onChangeText={(text) => updateHrRequirements("job_id", text)}
              placeholder="Enter job ID"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Role</Text>
            <TextInput
              style={styles.textInput}
              value={formData.hrRequirements.role}
              onChangeText={(text) => updateHrRequirements("role", text)}
              placeholder="Enter job role"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Job Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.hrRequirements.job_description}
              onChangeText={(text) =>
                updateHrRequirements("job_description", text)
              }
              placeholder="Enter detailed job description"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Experience Requirements</Text>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Minimum (years)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hrRequirements.experience_required.minimum.toString()}
                  onChangeText={(text) =>
                    updateHrRequirements(
                      "experience_required.minimum",
                      Number(text) || 0
                    )
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Maximum (years)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hrRequirements.experience_required.maximum.toString()}
                  onChangeText={(text) =>
                    updateHrRequirements(
                      "experience_required.maximum",
                      Number(text) || 0
                    )
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Industry</Text>
              <TextInput
                style={styles.textInput}
                value={
                  formData.hrRequirements.experience_required.preferred_industry
                }
                onChangeText={(text) =>
                  updateHrRequirements(
                    "experience_required.preferred_industry",
                    text
                  )
                }
                placeholder="Enter preferred industry"
              />
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Notice Period</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Required Notice Period</Text>
              <TextInput
                style={styles.textInput}
                value={formData.hrRequirements.notice_period.required}
                onChangeText={(text) =>
                  updateHrRequirements("notice_period.required", text)
                }
                placeholder="e.g., Immediate to 30 days"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Notice Period</Text>
              <TextInput
                style={styles.textInput}
                value={formData.hrRequirements.notice_period.preferred}
                onChangeText={(text) =>
                  updateHrRequirements("notice_period.preferred", text)
                }
                placeholder="e.g., 15 days"
              />
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Location</Text>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hrRequirements.location.city}
                  onChangeText={(text) =>
                    updateHrRequirements("location.city", text)
                  }
                  placeholder="City"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hrRequirements.location.state}
                  onChangeText={(text) =>
                    updateHrRequirements("location.state", text)
                  }
                  placeholder="State"
                />
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Country</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hrRequirements.location.country}
                  onChangeText={(text) =>
                    updateHrRequirements("location.country", text)
                  }
                  placeholder="Country"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Remote Option</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.hrRequirements.location.remote_option}
                  onChangeText={(text) =>
                    updateHrRequirements("location.remote_option", text)
                  }
                  placeholder="e.g., Hybrid, Remote, Onsite"
                />
              </View>
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Required Skills</Text>

            {formData.hrRequirements.required_skills.map((skill, index) => (
              <View key={index} style={styles.itemRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={skill}
                  onChangeText={(text) =>
                    updateHrRequirementItem("required_skills", index, text)
                  }
                  placeholder="Enter skill"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() =>
                    removeHrRequirementItem("required_skills", index)
                  }
                >
                  <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => addHrRequirementItem("required_skills")}
            >
              <Ionicons name="add-circle" size={20} color="#4a6da7" />
              <Text style={styles.addItemText}>Add Required Skill</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Preferred Skills</Text>

            {formData.hrRequirements.preferred_skills.map((skill, index) => (
              <View key={index} style={styles.itemRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={skill}
                  onChangeText={(text) =>
                    updateHrRequirementItem("preferred_skills", index, text)
                  }
                  placeholder="Enter skill"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() =>
                    removeHrRequirementItem("preferred_skills", index)
                  }
                >
                  <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => addHrRequirementItem("preferred_skills")}
            >
              <Ionicons name="add-circle" size={20} color="#4a6da7" />
              <Text style={styles.addItemText}>Add Preferred Skill</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Qualifications</Text>

            {formData.hrRequirements.qualifications.map(
              (qualification, index) => (
                <View key={index} style={styles.itemRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={qualification}
                    onChangeText={(text) =>
                      updateHrRequirementItem("qualifications", index, text)
                    }
                    placeholder="Enter qualification"
                  />
                  <TouchableOpacity
                    style={styles.removeItemButton}
                    onPress={() =>
                      removeHrRequirementItem("qualifications", index)
                    }
                  >
                    <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              )
            )}

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => addHrRequirementItem("qualifications")}
            >
              <Ionicons name="add-circle" size={20} color="#4a6da7" />
              <Text style={styles.addItemText}>Add Qualification</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Form Fields</Text>
          <Text style={styles.sectionSubtitle}>
            Add the fields you want candidates to fill out
          </Text>

          {formData.fields.map((field) => (
            <View key={field.id} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldNumber}>Field {field.id}</Text>
                {formData.fields.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeFieldButton}
                    onPress={() => removeField(field.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Field Label *</Text>
                <TextInput
                  style={styles.textInput}
                  value={field.label}
                  onChangeText={(text) => updateField(field.id, "label", text)}
                  placeholder="Enter field label"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Field Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={field.type}
                    style={styles.picker}
                    onValueChange={(value) =>
                      updateField(field.id, "type", value)
                    }
                  >
                    <Picker.Item label="Text" value="text" />
                    <Picker.Item label="Email" value="email" />
                    <Picker.Item label="Phone" value="tel" />
                    <Picker.Item label="Number" value="number" />
                    <Picker.Item label="Dropdown" value="select" />
                    <Picker.Item label="Multiple Choice" value="radio" />
                    <Picker.Item label="Checkbox" value="checkbox" />
                    <Picker.Item label="Date" value="date" />
                    <Picker.Item label="Resume Upload" value="file" />
                    <Picker.Item label="Textarea" value="textarea" />
                  </Picker>
                </View>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    updateField(field.id, "required", !field.required)
                  }
                >
                  {field.required && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Required field</Text>
              </View>

              {renderFieldOptions(field)}
            </View>
          ))}

          <TouchableOpacity style={styles.addFieldButton} onPress={addField}>
            <Ionicons name="add-circle" size={24} color="#4a6da7" />
            <Text style={styles.addFieldText}>Add New Field</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.createButtonText}>Create Form</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  backButton: {
    padding: 4,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  fieldCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fieldNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a6da7",
  },
  removeFieldButton: {
    padding: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 6,
    backgroundColor: "#f5f5f5",
  },
  picker: {
    height: 50,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#4a6da7",
    backgroundColor: "#4a6da7",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
  },
  optionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  optionsLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  removeOptionButton: {
    marginLeft: 8,
    padding: 4,
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addOptionText: {
    color: "#4a6da7",
    marginLeft: 4,
    fontSize: 14,
  },
  addFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f0f4f9",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#4a6da7",
  },
  addFieldText: {
    color: "#4a6da7",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  createButton: {
    flex: 2,
    padding: 16,
    backgroundColor: "#4a6da7",
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  subSection: {
    marginTop: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a6da7",
    marginBottom: 12,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f0f4fa",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  addItemText: {
    fontSize: 14,
    color: "#4a6da7",
    marginLeft: 8,
  },
  removeItemButton: {
    marginLeft: 12,
  },
});
